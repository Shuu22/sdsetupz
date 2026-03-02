// Perfis de Atmosphère / firmware.
const VERSION_PROFILES = [
  {
    id: "atm_1_8_0_fw19",
    label: "Atmosphère 1.8.0 (FW 19.0.x+)",
    description:
      "Primeira versão com suporte a firmware 19.0.0. Boa opção estável para ficar em 19.x.",
    atmosphere: {
      repo: "Atmosphere-NX/Atmosphere",
      tag: "1.8.0",
      assetNameIncludes: "atmosphere-",
      assetExt: ".zip"
    },
    hekate: {
      repo: "CTCaer/hekate",
      tag: "v6.2.2",
      assetNameIncludes: "hekate_ctcaer_",
      assetExt: ".zip"
    }
  },
  {
    id: "atm_1_9_5_fw20",
    label: "Atmosphère 1.9.5 (FW 20.0.x+)",
    description:
      "Linha 20.x do firmware; ainda compatível com 19.x, mas focada em 20.0.0+.",
    atmosphere: {
      repo: "Atmosphere-NX/Atmosphere",
      tag: "1.9.5",
      assetNameIncludes: "atmosphere-",
      assetExt: ".zip"
    },
    hekate: {
      repo: "CTCaer/hekate",
      tag: "v6.3.0",
      assetNameIncludes: "hekate_ctcaer_",
      assetExt: ".zip"
    }
  },
  {
    id: "atm_latest",
    label: "Atmosphère mais recente (21.x+)",
    description:
      "Usa sempre a release mais recente do Atmosphère (e Hekate) via GitHub API.",
    atmosphere: {
      repo: "Atmosphere-NX/Atmosphere",
      tag: "latest",
      assetNameIncludes: "atmosphere-",
      assetExt: ".zip"
    },
    hekate: {
      repo: "CTCaer/hekate",
      tag: "latest",
      assetNameIncludes: "hekate_ctcaer_",
      assetExt: ".zip"
    }
  }
];

// Fontes dos homebrews.
const HOMEBREW_SOURCES = [
  {
    id: "jksv",
    label: "JKSV (save manager)",
    repo: "J-D-K/JKSV",
    tag: "latest",
    assetNameIncludes: "JKSV",
    assetExt: ".nro",
    defaultSelected: true
  },
  {
    id: "ftpd",
    label: "ftpd (FTP server)",
    directUrl: "https://mtheall.com/~mtheall/ftpd.nro",
    assetExt: ".nro",
    defaultSelected: true
  },
  {
    id: "nxthemes",
    label: "NXThemesInstaller (temas)",
    repo: "exelix11/SwitchThemeInjector",
    tag: "latest",
    assetNameIncludes: "NXThemesInstaller",
    assetExt: ".nro",
    defaultSelected: true
  },
  {
    id: "nxshell",
    label: "NX-Shell (file manager)",
    repo: "joel16/NX-Shell",
    tag: "latest",
    assetNameIncludes: "NX-Shell",
    assetExt: ".nro",
    defaultSelected: true
  },
  {
    id: "goldleaf",
    label: "Goldleaf (title manager)",
    repo: "XorTroll/Goldleaf",
    tag: "latest",
    assetNameIncludes: "Goldleaf",
    assetExt: ".nro",
    defaultSelected: true
  }
];

// Conteúdo mínimo para hekate_ipl.ini gerado.
const DEFAULT_HEKATE_INI = `
[CFW - emuMMC]
fss0=atmosphere/package3
emmcread=0
kip1patch=nosigchk
atmosphere=1

[CFW - sysMMC]
fss0=atmosphere/package3
kip1patch=nosigchk
atmosphere=1
`;

// emummc.txt básico.
const DEFAULT_EMUMMC_TXT = `
# Bloqueia emuMMC de acessar servidores Nintendo (exemplo simples).
127.0.0.1   conntest.nintendowifi.net
127.0.0.1   nus.c.shop.nintendowifi.net
127.0.0.1   eou.cdn.nintendo.net
`;
