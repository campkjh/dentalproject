# GPS 지역 판정용 행정경계

본 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor, https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다.

- 원본: `vuski/admdongkor`, `parquet/sgg_20261001.parquet`
- 고정 원본 커밋: `3bc00489b76696db864bdbea4b19985cdfa8b403`
- 원본 URL: https://github.com/vuski/admdongkor/blob/3bc00489b76696db864bdbea4b19985cdfa8b403/parquet/sgg_20261001.parquet
- 데이터 기준: 2026-10-01. 원본 데이터의 완전성·정확성을 보증하는 자료는 아니며, 법적·측량 용도가 아닌 병원 검색 지역 필터에 사용한다.
- 라이선스: KOGL Type 1 및 CC BY 4.0. 원본 라이선스: https://github.com/vuski/admdongkor/blob/3bc00489b76696db864bdbea4b19985cdfa8b403/LICENSE-DATA

마이닥에서 추가한 가공: EPSG:5179 → WGS84(EPSG:4326) 변환, 일반구를 같은 시로 합침(안산시상록구·안산시단원구 → 안산시), 기존 병원 주소의 광주·전남 표기와 호환되는 지역 키 유지, 좌표 소수점 6자리 반올림. 가장 가까운 도시로 대체하거나 경계 형태를 추가 단순화하지 않는다. 원본 파일의 SHA-256은 JSON 메타데이터에 기록한다.

재생성: 별도 Python 환경에 `pyarrow shapely pyproj`를 설치하고, 고정 버전 parquet 파일을 내려받아 `python scripts/build-region-boundaries.py /path/to/sgg_20261001.parquet`를 실행한다. 앱 런타임에는 Python이나 외부 지도 API가 필요하지 않다.
