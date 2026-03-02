const versionSelect = document.getElementById("versionSelect");
const buildButton = document.getElementById("buildButton");
const statusEl = document.getElementById("status");
const versionInfoEl = document.getElementById("versionInfo");
const homebrewListEl = document.getElementById("homebrewList");
const resultInfoEl = document.getElementById("resultInfo");

function setStatus(text) {
  statusEl.textContent = text;
}

function appendStatus(text) {
  statusEl.textContent += "\n" + text;
}

function setResultInfo(text) {
  resultInfoEl.textContent = text;
}

function populateVersions() {
  VERSION_PROFILES.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    versionSelect.appendChild(opt);
  });
  updateVersionInfo();
}

function updateVersionInfo() {
  const profile = getSelectedProfile();
  if (!profile) {
    versionInfoEl.textContent = "";
    return;
  }
  versionInfoEl.textContent = profile.description;
}

function renderHomebrewOptions() {
  homebrewListEl.innerHTML = "";
  HOMEBREW_SOURCES.forEach((hb) => {
    const wrapper = document.createElement("div");
    wrapper.className = "homebrew-item";

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = hb.id;
    checkbox.checked = hb.defaultSelected;
    label.appendChild(checkbox);

    const span = document.createElement("span");
    span.textContent = hb.label;
    label.appendChild(span);

    wrapper.appendChild(label);
    homebrewListEl.appendChild(wrapper);
  });
}

function getSelectedProfile() {
  const id = versionSelect.value;
  return VERSION_PROFILES.find((v) => v.id === id);
}

function getSelectedHomebrews() {
  const selected = [];
  const checkboxes = homebrewListEl.querySelectorAll("input[type=checkbox]");
  checkboxes.forEach((cb) => {
    if (cb.checked) {
      const hb = HOMEBREW_SOURCES.find((h) => h.id === cb.value);
      if (hb) selected.push(hb);
    }
  });
  return selected;
}

async function githubApiJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });
  if (!res.ok) {
    throw new Error(`GitHub API falhou em ${url} (${res.status})`);
  }
  return res.json();
}

async function resolveGithubAssetUrl({ repo, tag, assetNameIncludes, assetExt }) {
  const base = `https://api.github.com/repos/${repo}/releases`;
  const url =
    tag === "latest"
      ? `${base}/latest`
      : `${base}/tags/${encodeURIComponent(tag)}`;

  const data = await githubApiJson(url);

  const assets = data.assets || [];
  const lowerMatch = (s) => s.toLowerCase();
  const target = assets.find((a) => {
    const n = lowerMatch(a.name || "");
    return n.includes(assetNameIncludes.toLowerCase()) && n.endsWith(assetExt);
  });

  if (!target) {
    throw new Error(
      `Não encontrei asset ${assetExt} contendo "${assetNameIncludes}" em ${repo} (tag ${tag}).`
    );
  }

  return {
    url: target.browser_download_url,
    name: target.name,
    size: target.size,
    tag: data.tag_name || data.name || tag,
    publishedAt: data.published_at
  };
}

async function fetchAsArrayBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao baixar ${url} (${res.status})`);
  }
  return await res.arrayBuffer();
}

async function mergeZipInto(zipDest, arrayBuffer, options = {}) {
  const zipSrc = await JSZip.loadAsync(arrayBuffer);
  const { prefixFilter, removePrefix } = options;

  const tasks = [];

  zipSrc.forEach((relativePath, file) => {
    if (prefixFilter && !relativePath.startsWith(prefixFilter)) {
      return;
    }

    let destPath = relativePath;
    if (removePrefix && destPath.startsWith(removePrefix)) {
      destPath = destPath.slice(removePrefix.length);
    }

    tasks.push(
      file.async("arraybuffer").then((content) => {
        if (file.dir) {
          zipDest.folder(destPath);
        } else {
          zipDest.file(destPath, content);
        }
      })
    );
  });

  await Promise.all(tasks);
}

async function addFileFromString(zip, path, content) {
  zip.file(path, content);
}

async function addFileFromUrl(zip, path, url) {
  const buf = await fetchAsArrayBuffer(url);
  zip.file(path, buf);
}

async function sha256HexFromBlob(blob) {
  const buf = await blob.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildZip() {
  const profile = getSelectedProfile();
  if (!profile) {
    setStatus("Selecione um perfil de Atmosphère.");
    return;
  }

  const selectedHomebrews = getSelectedHomebrews();
  if (selectedHomebrews.length === 0) {
    if (!confirm("Nenhum homebrew selecionado. Continuar mesmo assim?")) {
      return;
    }
  }

  buildButton.disabled = true;
  setStatus(
    `Resolvendo versões para: ${profile.label}...\nIsso pode levar alguns minutos.`
  );
  setResultInfo("");

  const errors = [];

  try {
    const finalZip = new JSZip();

    appendStatus("Consultando releases do Atmosphère...");
    const atmAsset = await resolveGithubAssetUrl(profile.atmosphere);
    appendStatus(`Atmosphère: ${atmAsset.name} (${atmAsset.tag})`);

    appendStatus("Consultando releases do Hekate...");
    const hekAsset = await resolveGithubAssetUrl(profile.hekate);
    appendStatus(`Hekate: ${hekAsset.name} (${hekAsset.tag})`);

    try {
      appendStatus("Baixando Atmosphère...");
      const atmBuf = await fetchAsArrayBuffer(atmAsset.url);
      appendStatus("Mesclando Atmosphère na raiz do SD...");
      await mergeZipInto(finalZip, atmBuf, {});
    } catch (e) {
      errors.push(`Atmosphère: ${e.message}`);
      throw new Error("Falha crítica ao processar Atmosphère. Abortando.");
    }

    try {
      appendStatus("Baixando Hekate...");
      const hekBuf = await fetchAsArrayBuffer(hekAsset.url);
      appendStatus("Mesclando bootloader do Hekate...");
      await mergeZipInto(finalZip, hekBuf, {
        prefixFilter: "bootloader/",
        removePrefix: ""
      });
    } catch (e) {
      errors.push(`Hekate: ${e.message}`);
      throw new Error("Falha crítica ao processar Hekate. Abortando.");
    }

    appendStatus("Adicionando hekate_ipl.ini (config genérica)...");
    await addFileFromString(
      finalZip,
      "bootloader/hekate_ipl.ini",
      DEFAULT_HEKATE_INI
    );

    appendStatus("Adicionando emummc.txt (bloqueio básico de emuMMC)...");
    await addFileFromString(
      finalZip,
      "atmosphere/hosts/emummc.txt",
      DEFAULT_EMUMMC_TXT
    );

    if (selectedHomebrews.length > 0) {
      appendStatus("Baixando homebrews selecionados...");
      for (const hb of selectedHomebrews) {
        try {
          if (hb.directUrl) {
            appendStatus(`Baixando ${hb.label}...`);
            const baseName = hb.label.split(" ")[0];
            await addFileFromUrl(
              finalZip,
              `switch/${baseName}.nro`,
              hb.directUrl
            );
          } else {
            appendStatus(`Consultando release de ${hb.label}...`);
            const hbAsset = await resolveGithubAssetUrl(hb);
            appendStatus(`Baixando ${hbAsset.name}...`);
            await addFileFromUrl(
              finalZip,
              `switch/${hbAsset.name}`,
              hbAsset.url
            );
          }
          appendStatus(`✔ ${hb.label}`);
        } catch (e) {
          errors.push(`${hb.label}: ${e.message}`);
          appendStatus(
            `⚠ Falha ao adicionar ${hb.label}, continuando sem ele.`
          );
        }
      }
    } else {
      appendStatus("Nenhum homebrew selecionado; pulando etapa de /switch/.");
    }

    appendStatus("Compactando pacote final...");
    const content = await finalZip.generateAsync({ type: "blob" });

    appendStatus("Calculando checksum SHA-256 do pacote...");
    const sha256 = await sha256HexFromBlob(content);

    const fileNameSafe = profile.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `switch_sd_${fileNameSafe}.zip`;

    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    appendStatus(`Pronto! Arquivo gerado: ${fileName}`);
    const sizeMB = (content.size / (1024 * 1024)).toFixed(2);

    let info = `Arquivo: ${fileName}\nTamanho: ${sizeMB} MiB\nSHA-256: ${sha256}`;
    if (errors.length > 0) {
      info += `\n\nAvisos:\n- ${errors.join("\n- ")}`;
    }
    setResultInfo(info);
  } catch (err) {
    console.error(err);
    appendStatus(`\nERRO: ${err.message}`);
    if (errors.length > 0) {
      appendStatus(`Detalhes:\n- ${errors.join("\n- ")}`);
    }
  } finally {
    buildButton.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateVersions();
  renderHomebrewOptions();
  buildButton.addEventListener("click", buildZip);
  versionSelect.addEventListener("change", updateVersionInfo);
});
