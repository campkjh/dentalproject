"""Convert SGIS-derived municipal boundaries to a server-only GPS lookup.

Developer dependencies: pyarrow shapely pyproj. Pass the source parquet path.
Source/license: src/lib/data/REGION-DATA-NOTICE.md
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import pyarrow.parquet as parquet
from pyproj import Transformer
from shapely import from_wkb, make_valid
from shapely.geometry import mapping
from shapely.ops import transform, unary_union

source = Path(sys.argv[1])
groups = {}
for row in parquet.read_table(source).to_pylist():
    province, district = row['sidonm'], row['sggnm']
    # Keep the same address keys used by the existing hospital catalog.
    if province == '전남광주통합특별시':
        province = '광주광역시' if district in {'동구', '서구', '남구', '북구', '광산구'} else '전라남도'
    if province == '세종특별자치시':
        district = None
    else:
        match = re.match(r'^(.+?시)', district)
        if match:
            district = match.group(1)
    groups.setdefault((province, district), []).append(make_valid(from_wkb(row['geom'])))

project = Transformer.from_crs('EPSG:5179', 'EPSG:4326', always_xy=True).transform

def rounded(value):
    if isinstance(value, (list, tuple)):
        return [rounded(item) for item in value]
    return round(value, 6)

regions = []
for (province, district), shapes in sorted(groups.items(), key=lambda item: str(item[0])):
    geometry = transform(project, unary_union(shapes))
    shape = mapping(geometry)
    polygons = [shape['coordinates']] if shape['type'] == 'Polygon' else shape['coordinates']
    assert shape['type'] in {'Polygon', 'MultiPolygon'}, shape['type']
    regions.append({
        'province': province, 'district': district,
        'bounds': [round(value, 6) for value in geometry.bounds],
        'polygons': rounded(polygons),
    })

result = {
    'date': '2026-10-01', 'crs': 'EPSG:4326',
    'source': 'Statistics Korea SGIS / vuski/admdongkor',
    'license': 'KOGL Type 1 / CC-BY-4.0',
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'regions': regions,
}
target = Path(__file__).resolve().parents[1] / 'src/lib/data/korea-regions-20261001.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'{len(regions)} city/district boundaries, {target.stat().st_size} bytes')
