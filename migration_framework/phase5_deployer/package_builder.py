"""パッケージビルダー - aKaBotプロジェクト → .nupkg パッケージ化"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import json
import logging
import zipfile
from pathlib import Path

logger = logging.getLogger(__name__)


class PackageBuilder:
    """aKaBotプロジェクトディレクトリを .nupkg パッケージに変換する

    aKaBot/UiPath の .nupkg は実質 ZIP で、以下の構造:
    ├── [Content_Types].xml
    ├── _rels/.rels
    ├── package/services/metadata/core-properties/xxx.psmdcp
    ├── *.nuspec
    ├── lib/net45/
    │   ├── Main.xaml
    │   ├── project.json
    │   └── ...
    """

    def build(self, project_dir: Path, output_dir: Path | None = None) -> Path:
        """プロジェクトディレクトリから .nupkg を生成する"""
        if output_dir is None:
            output_dir = project_dir.parent

        project_json = project_dir / "project.json"
        if project_json.exists():
            meta = json.loads(project_json.read_text(encoding="utf-8"))
        else:
            meta = {"name": project_dir.name, "version": "1.0.0"}

        package_name = meta.get("name", project_dir.name)
        version = meta.get("version", "1.0.0")
        nupkg_name = f"{package_name}.{version}.nupkg"
        nupkg_path = output_dir / nupkg_name

        with zipfile.ZipFile(nupkg_path, "w", zipfile.ZIP_DEFLATED) as zf:
            # NuSpec メタデータ
            nuspec = self._generate_nuspec(package_name, version, meta)
            zf.writestr(f"{package_name}.nuspec", nuspec)

            # Content_Types
            zf.writestr("[Content_Types].xml", self._content_types_xml())

            # .rels
            zf.writestr("_rels/.rels", self._rels_xml(package_name))

            # プロジェクトファイル
            for file_path in project_dir.rglob("*"):
                if file_path.is_file():
                    arcname = f"lib/net45/{file_path.relative_to(project_dir)}"
                    zf.write(file_path, arcname)

        logger.info("パッケージ生成: %s (%.1f KB)", nupkg_path, nupkg_path.stat().st_size / 1024)
        return nupkg_path

    def _generate_nuspec(self, name: str, version: str, meta: dict) -> str:
        return f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd">
  <metadata>
    <id>{name}</id>
    <version>{version}</version>
    <title>{meta.get('description', name)}</title>
    <authors>BizRobo Migration Tool</authors>
    <description>Auto-migrated from BizRobo to aKaBot</description>
    <dependencies>
      <dependency id="aKaBot.Activities" version="1.0.0" />
    </dependencies>
  </metadata>
</package>"""

    def _content_types_xml(self) -> str:
        return """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="nuspec" ContentType="application/octet" />
  <Default Extension="xaml" ContentType="application/octet" />
  <Default Extension="json" ContentType="application/octet" />
</Types>"""

    def _rels_xml(self, name: str) -> str:
        return f"""<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://schemas.microsoft.com/packaging/2010/07/manifest"
                Target="/{name}.nuspec" Id="R1" />
</Relationships>"""
