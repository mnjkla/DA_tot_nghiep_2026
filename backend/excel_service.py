import csv
import io
import zipfile
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape


def _col_letter(col_idx: int) -> str:
    """Convert 1-based column index to Excel column letter (1 -> A, 27 -> AA)."""
    result = ""
    while col_idx > 0:
        col_idx, rem = divmod(col_idx - 1, 26)
        result = chr(65 + rem) + result
    return result


def build_multi_sheet_xlsx(sheets: dict[str, list[dict]]) -> bytes:
    """
    Build a genuine OpenXML .xlsx workbook with multiple sheets using pure Python stdlib.
    `sheets` maps sheet_name -> list of row dicts.
    """
    buf = io.BytesIO()
    sheet_names = list(sheets.keys()) or ["Sheet1"]

    content_types_sheets = "".join(
        f'<Override PartName="/xl/worksheets/sheet{i}.xml" '
        f'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for i in range(1, len(sheet_names) + 1)
    )
    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/styles.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        f"{content_types_sheets}"
        "</Types>"
    )

    root_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/>'
        "</Relationships>"
    )

    wb_sheets_xml = "".join(
        f'<sheet name="{escape(name[:31])}" sheetId="{i}" r:id="rId{i}"/>'
        for i, name in enumerate(sheet_names, start=1)
    )
    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f"<sheets>{wb_sheets_xml}</sheets>"
        "</workbook>"
    )

    wb_rels_items = "".join(
        f'<Relationship Id="rId{i}" '
        f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        f'Target="worksheets/sheet{i}.xml"/>'
        for i in range(1, len(sheet_names) + 1)
    )
    style_rel_id = len(sheet_names) + 1
    wb_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f"{wb_rels_items}"
        f'<Relationship Id="rId{style_rel_id}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>'
        "</Relationships>"
    )

    styles_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="2">'
        '<font><sz val="11"/><name val="Calibri"/></font>'
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
        "</fonts>"
        '<fills count="3">'
        '<fill><patternFill patternType="none"/></fill>'
        '<fill><patternFill patternType="gray125"/></fill>'
        '<fill><patternFill patternType="solid"><fgColor rgb="FF059669"/><bgColor indexed="64"/></patternFill></fill>'
        "</fills>"
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        '<cellXfs count="2">'
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
        "</cellXfs>"
        "</styleSheet>"
    )

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml)
        zf.writestr("_rels/.rels", root_rels_xml)
        zf.writestr("xl/workbook.xml", workbook_xml)
        zf.writestr("xl/_rels/workbook.xml.rels", wb_rels_xml)
        zf.writestr("xl/styles.xml", styles_xml)

        for idx, name in enumerate(sheet_names, start=1):
            rows = sheets.get(name) or []
            headers = list(rows[0].keys()) if rows else ["Thong_Tin"]
            row_xml_parts = []

            # Header row (row 1, style s="1")
            header_cells = []
            for c_idx, h in enumerate(headers, start=1):
                col_ref = f"{_col_letter(c_idx)}1"
                header_cells.append(
                    f'<c r="{col_ref}" t="inlineStr" s="1"><is><t>{escape(str(h))}</t></is></c>'
                )
            row_xml_parts.append(f'<row r="1">{"".join(header_cells)}</row>')

            # Data rows
            for r_idx, row_dict in enumerate(rows, start=2):
                cells = []
                for c_idx, h in enumerate(headers, start=1):
                    col_ref = f"{_col_letter(c_idx)}{r_idx}"
                    val = row_dict.get(h, "")
                    if val is None:
                        val = ""
                    if isinstance(val, (int, float)) and not isinstance(val, bool):
                        cells.append(f'<c r="{col_ref}"><v>{val}</v></c>')
                    else:
                        text_val = escape(str(val))
                        cells.append(
                            f'<c r="{col_ref}" t="inlineStr"><is><t>{text_val}</t></is></c>'
                        )
                row_xml_parts.append(f'<row r="{r_idx}">{"".join(cells)}</row>')

            sheet_xml = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                f'<sheetData>{"".join(row_xml_parts)}</sheetData>'
                "</worksheet>"
            )
            zf.writestr(f"xl/worksheets/sheet{idx}.xml", sheet_xml)

    return buf.getvalue()


def build_csv_bytes(rows: list[dict]) -> bytes:
    """Build UTF-8 with BOM CSV bytes for Excel compatibility with Vietnamese text."""
    output = io.StringIO()
    if not rows:
        return "\ufeffKhong_Co_Du_Lieu\n".encode("utf-8-sig")
    headers = list(rows[0].keys())
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    return output.getvalue().encode("utf-8-sig")


def _col_ref_to_idx(cell_ref: str) -> int:
    """Convert cell reference like 'B2' or 'AA10' to 0-based column index."""
    letters = "".join(ch for ch in cell_ref if ch.isalpha()).upper()
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - 64)
    return max(0, idx - 1)


def parse_tabular_file(file_bytes: bytes, filename: str = "upload.csv") -> list[dict]:
    """
    Parse either a .xlsx or .csv file into a list of row dicts using pure Python stdlib.
    """
    fname = (filename or "").lower().strip()
    if fname.endswith(".xlsx") or file_bytes[:4] == b"PK\x03\x04":
        with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as zf:
            shared_strings = []
            if "xl/sharedStrings.xml" in zf.namelist():
                ss_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
                for si in ss_root.findall(".//{*}si"):
                    texts = [t.text or "" for t in si.findall(".//{*}t")]
                    shared_strings.append("".join(texts))

            sheet_files = sorted(
                name for name in zf.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
            )
            if not sheet_files:
                return []

            ws_root = ET.fromstring(zf.read(sheet_files[0]))
            parsed_rows = []
            for row_el in ws_root.findall(".//{*}sheetData/{*}row"):
                row_vals = {}
                max_col = -1
                for cell in row_el.findall("{*}c"):
                    ref = cell.attrib.get("r", "A1")
                    c_idx = _col_ref_to_idx(ref)
                    max_col = max(max_col, c_idx)
                    c_type = cell.attrib.get("t", "")
                    val = ""
                    if c_type == "inlineStr":
                        texts = [t.text or "" for t in cell.findall(".//{*}t")]
                        val = "".join(texts)
                    elif c_type == "s":
                        v_el = cell.find("{*}v")
                        if v_el is not None and v_el.text is not None:
                            s_idx = int(v_el.text)
                            val = shared_strings[s_idx] if 0 <= s_idx < len(shared_strings) else ""
                    else:
                        v_el = cell.find("{*}v")
                        val = v_el.text if (v_el is not None and v_el.text is not None) else ""
                    row_vals[c_idx] = val
                if max_col >= 0:
                    parsed_rows.append([row_vals.get(i, "") for i in range(max_col + 1)])

            if len(parsed_rows) < 2:
                return []
            headers = [str(h).strip() for h in parsed_rows[0]]
            result = []
            for r in parsed_rows[1:]:
                if not any(str(x).strip() for x in r):
                    continue
                item = {}
                for idx, h in enumerate(headers):
                    if h:
                        item[h] = r[idx] if idx < len(r) else ""
                result.append(item)
            return result

    # Fallback: parse CSV (UTF-8-SIG / UTF-8 / CP1258 / Latin-1)
    text_content = None
    for enc in ("utf-8-sig", "utf-8", "cp1258", "latin-1"):
        try:
            text_content = file_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text_content is None:
        text_content = file_bytes.decode("utf-8", errors="ignore")

    reader = csv.DictReader(io.StringIO(text_content))
    return [
        {str(k).strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items() if k}
        for row in reader
        if any(str(v or "").strip() for v in row.values())
    ]

