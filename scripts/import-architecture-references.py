#!/usr/bin/env python3
"""Refresh sourced reference facts. Standard library only; cached, serial WDQS queries.
Not weight training. No images or article text are downloaded. Partial failures remain
visible in coverage.json; --strict refuses to publish an incomplete query run.
"""
import argparse, concurrent.futures, collections, datetime, hashlib, io, json, math, pathlib, time, urllib.error, urllib.parse, urllib.request, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/architecture'
CACHE = pathlib.Path('/tmp/sight3d-architecture-import')
AGENT = 'Sight3D-ReferenceImporter/1.0 (https://github.com/tackleguy/sight3d)'
LEAGUE_IDS = 'Q1215884 Q1163715 Q155223 Q1215892 Q18543 Q2593221 Q1101443 Q9448 Q324867 Q82595 Q15804 Q13394 Q167541 Q182994 Q206813 Q223170 Q764690 Q255633 Q276445 Q219586 Q396412 Q4905035 Q50783 Q1140630 Q855988 Q6002 Q5798'.split()
LEAGUES = ['National Football League','Major League Baseball','National Basketball Association','National Hockey League','Major League Soccer',"Women's National Basketball Association",'National Women\'s Soccer League','Premier League','La Liga','Bundesliga','Serie A','Ligue 1','Eredivisie','Primeira Liga','Campeonato Brasileiro Série A','Argentine Primera División','Liga MX','Saudi Pro League','J1 League','A-League Men','Indian Premier League','Big Bash League','Australian Football League','National Rugby League','Super Rugby','United Rugby Championship','Top 14']
PREFIX = '''PREFIX wd: <http://www.wikidata.org/entity/> PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/> PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/> PREFIX psn: <http://www.wikidata.org/prop/statement/value-normalized/>
PREFIX wikibase: <http://wikiba.se/ontology#> PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX hint: <http://www.bigdata.com/queryHints#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX schema: <http://schema.org/>
'''
LABELS = 'SERVICE wikibase:label {bd:serviceParam wikibase:language "en".}'
def fetch(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': AGENT}), timeout=85) as response: return response.read()
        except urllib.error.HTTPError as error:
            if error.code == 429: time.sleep(min(60, int(error.headers.get('Retry-After', '30'))))
            elif error.code not in (500,502,503,504): raise
            elif attempt < 2: time.sleep(3 * (attempt+1))
            if attempt == 2: raise

def query(name, sparql):
    path = CACHE / (hashlib.sha256(sparql.encode()).hexdigest()+'.json')
    if path.exists(): data=json.loads(path.read_text())
    else:
        data=json.loads(fetch('https://query.wikidata.org/sparql?'+urllib.parse.urlencode({'query':PREFIX+sparql,'format':'json'})))
        path.write_text(json.dumps(data))
    rows=[{k:v['value'] for k,v in row.items()} for row in data['results']['bindings']]
    print(name, len(rows), flush=True)
    return rows

def qid(uri): return uri.rsplit('/',1)[-1]
def number(value):
    try:
        v=float(value)
        return round(v,3) if math.isfinite(v) else None
    except (ValueError,TypeError): return None

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--strict',action='store_true');parser.add_argument('--refresh',action='store_true');args=parser.parse_args()
    CACHE.mkdir(exist_ok=True);OUT.mkdir(exist_ok=True)
    if args.refresh:
        for path in CACHE.glob('*.json'): path.unlink()
    failures=[];records={};leagues=[]
    def run(name,q):
        try: return query(name,q)
        except Exception as e: failures.append({'query':name,'error':str(e)}); print(name,'FAILED',e,flush=True);return []
    def ensure(row,category):
        id=qid(row['item']);r=records.setdefault(id,{'id':id,'name':row.get('itemLabel',id),'categories':[]})
        if category not in r['categories']:r['categories'].append(category)
        if row.get('itemLabel') and row['itemLabel']!=id:r['name']=row['itemLabel']
        if row.get('height'):r['heightM']=number(row['height'])
        if row.get('coord'):
            parts=row['coord'].replace('Point(','').replace(')','').split()
            if len(parts)==2:r['coordinates']=[float(parts[1]),float(parts[0])]
        return r
    # Direct types are partitioned to avoid expensive global subclass joins. Their
    # scope is reported, never described as an exhaustive worldwide inventory.
    classes=[('stadium','Q483110'),('arena','Q641226'),('residential','Q11755880'),('skyscraper','Q11303')]
    for category,kind in classes:
        extra="?item wikibase:sitelinks ?links. FILTER(?links >= 1)" if category=="residential" else ""
        query_text=f'SELECT DISTINCT ?item ?itemLabel ?coord WHERE {{ ?item wdt:P31 wd:{kind}. {extra} OPTIONAL{{?item wdt:P625 ?coord}} {LABELS} }}'
        for row in run(category,query_text):ensure(row,category)
    for row in run('supertalls',f'SELECT DISTINCT ?item ?itemLabel ?height WHERE {{ ?item wdt:P31/wdt:P279* wd:Q11303; p:P2048/psn:P2048 ?v. ?v wikibase:quantityAmount ?height; wikibase:quantityUnit wd:Q11573. FILTER(?height>=300) {LABELS} }}'):ensure(row,'supertall')
    names=' '.join(json.dumps(n,ensure_ascii=False)+'@en' for n in LEAGUES)
    league_values=' '.join('wd:'+id for id in LEAGUE_IDS)
    league_rows=run('league IDs',f'SELECT ?league ?leagueLabel WHERE {{VALUES ?league {{{league_values}}} {LABELS} }}')
    canonical=dict(zip(LEAGUE_IDS,LEAGUES))
    for row in league_rows:row['leagueLabel']=canonical[qid(row['league'])]
    found={r['leagueLabel'] for r in league_rows}
    for name in LEAGUES:
        if name not in found:failures.append({'query':'league ID','error':'Unresolved league: '+name})
    for league in league_rows:
        lid=qid(league['league'])
        rows=run('teams '+league['leagueLabel'],f'''SELECT DISTINCT ?team ?teamLabel ?item ?itemLabel WHERE {{
          VALUES ?teamClass {{wd:Q12973014 wd:Q847017}} ?team wdt:P31/wdt:P279* ?teamClass; p:P118 ?membership. ?membership ps:P118 wd:{lid}.
          FILTER NOT EXISTS {{?membership pq:P582 ?end. FILTER(?end < NOW())}}
          FILTER NOT EXISTS {{?membership pq:P580 ?start. FILTER(?start > NOW())}}
          OPTIONAL {{?team p:P115 ?home. ?home ps:P115 ?item.
            FILTER NOT EXISTS {{?home pq:P582 ?endHome. FILTER(?endHome < NOW())}}
            FILTER NOT EXISTS {{?home pq:P580 ?startHome. FILTER(?startHome > NOW())}} }} {LABELS} }}''')
        teams={}
        for row in rows:
            team=teams.setdefault(qid(row['team']),{'id':qid(row['team']),'name':row['teamLabel'],'venues':[]})
            if row.get('item'):
                r=ensure(row,'sports venue');team['venues'].append(r['id'])
                r.setdefault('teams',[])
                link={'id':team['id'],'name':team['name'],'league':league['leagueLabel']}
                if link not in r['teams']:r['teams'].append(link)
        leagues.append({'id':lid,'name':league['leagueLabel'],'teams':list(teams.values())})
    (CACHE/'base-records.json').write_text(json.dumps(list(records.values())))
    # Enrich sports, tall, and residential examples. Generic city buildings retain
    # their own sourced name and coordinates, not invented architectural features.
    ids=[id for id,r in records.items() if r['categories']!=['building']]
    properties={'P2048':'height','P1101':'floors','P1083':'capacity','P149':'style','P186':'material','P84':'architect','P131':'location','P17':'country','P31':'type','P571':'inception','P576':'demolished'}
    def fetch_facts(start):
        values=' '.join('wd:'+id for id in ids[start:start+150])
        props=' '.join('wdt:'+p for p in properties if p!='P2048')
        return run(f'facts {start}/{len(ids)}',f'''SELECT ?item ?itemLabel ?property ?value ?valueLabel WHERE {{ hint:Query hint:optimizer "None". VALUES ?item {{{values}}}
          {{VALUES ?property {{{props}}} ?item ?property ?value.}} UNION
          {{?item p:P2048/psn:P2048 ?v. ?v wikibase:quantityUnit wd:Q11573; wikibase:quantityAmount ?value. BIND(wdt:P2048 AS ?property)}} UNION
          {{?item wdt:P625 ?value. BIND(wdt:P625 AS ?property)}} UNION
          {{?item schema:description ?value. FILTER(LANG(?value)="en") BIND(schema:description AS ?property)}} {LABELS.replace('en', 'en,mul')} }}''')
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
      for rows in pool.map(fetch_facts,range(0,len(ids),150)):
        for row in rows:
            r=records[qid(row['item'])]
            if row.get('itemLabel') and row['itemLabel']!=r['id']:r['name']=row['itemLabel']
            prop=qid(row['property']);value=row.get('valueLabel',row['value'])
            if prop=='description':r['description']=value
            elif prop=='P625':ensure({'item':row['item'],'coord':row['value']},r['categories'][0])
            elif prop=='P2048' and number(value):r['heightM']=max(r.get('heightM',0),number(value))
            elif prop in ('P1101','P1083') and number(value):r['floors' if prop=='P1101' else 'capacity']=number(value)
            elif prop in properties:
                key=properties[prop];r.setdefault(key,[])
                if value not in r[key]:r[key].append(value)
    # GeoNames populated places exclude city sections and historical/abandoned places.
    zip_path=CACHE/'cities15000.zip'
    if args.refresh or not zip_path.exists():zip_path.write_bytes(fetch('https://download.geonames.org/export/dump/cities15000.zip'))
    cities=[]
    for line in zipfile.ZipFile(zip_path).read('cities15000.txt').decode().splitlines():
        v=line.split('\t')
        if int(v[14])>200000 and v[7] not in ('PPLX','PPLH','PPLQ','PPLW'):
            cities.append({'id':v[0],'name':v[1],'asciiName':v[2],'country':v[8],'population':int(v[14]),'coordinates':[float(v[4]),float(v[5])],'populationRecordModified':v[18],'exampleIds':[]})
    # Proximity is explicitly not an administrative-boundary/city membership claim.
    grid=collections.defaultdict(list)
    for city in cities:grid[(math.floor(city['coordinates'][0]),math.floor(city['coordinates'][1]))].append(city)
    for r in records.values():
        if 'coordinates' not in r or r['name']==r['id']:continue
        lat,lon=r['coordinates'];near=[]
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                for c in grid[(math.floor(lat)+dy,math.floor(lon)+dx)]:
                    clat,clon=c['coordinates'];dist=111.2*math.hypot(lat-clat,(lon-clon)*math.cos(math.radians((lat+clat)/2)))
                    if dist<=25:near.append((dist,c))
        if near:
            dist,c=min(near,key=lambda pair:pair[0]);r['nearCityId']=c['id'];r['nearCityDistanceKm']=round(dist,1);c['exampleIds'].append(r['id'])
    counts=collections.Counter(c for r in records.values() for c in r['categories'])
    report={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':dict(counts),'references':len(records),'namedReferences':sum(r['name']!=r['id'] for r in records.values()),'referencesWithDescription':sum(bool(r.get('description')) for r in records.values()),'citiesOver200k':len(cities),'citiesWithNearbyExamples':sum(bool(c['exampleIds']) for c in cities),'citiesWithoutNearbyExamples':[c['id'] for c in cities if not c['exampleIds']],'leagues':leagues,'failures':failures,'scope':'Wikidata direct stadium/arena/residential/skyscraper classes (residential requires a Wikimedia sitelink); general city buildings are collected by the separate city-example importer plus skyscraper subclasses >=300m and linked league venues. Incomplete open data, not all buildings or a verified current team roster. Nearby city means closest GeoNames populated place over 200,000 within 25 km; not municipal boundaries. GeoNames population dates vary. Unqualified team/venue statements may be stale. No downloaded images, measured geometry, or model weight training.','sources':[{'name':'Wikidata','url':'https://www.wikidata.org/','license':'CC0'},{'name':'GeoNames','url':'https://download.geonames.org/export/dump/','license':'CC BY 4.0'}]}
    if args.strict and failures:raise RuntimeError('Import incomplete; refusing to publish. '+str(failures))
    for name,data in [('references',list(records.values())),('cities',cities),('coverage',report)]:
        path=OUT/(name+'.json');temp=path.with_suffix('.tmp');temp.write_text(('[\n'+',\n'.join(json.dumps(r,ensure_ascii=False,separators=(',',':')) for r in sorted(data,key=lambda r:r['id']))+'\n]\n') if isinstance(data,list) else json.dumps(data,ensure_ascii=False,indent=2)+'\n');temp.replace(path)
    print(json.dumps({k:report[k] for k in ('references','counts','citiesOver200k','citiesWithNearbyExamples','failures')},indent=2))
if __name__=='__main__':main()
