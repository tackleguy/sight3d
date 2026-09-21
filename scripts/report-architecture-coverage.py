#!/usr/bin/env python3
"""Write an auditable human-readable report from the shipped snapshots."""
import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]/'data/architecture'
def read(name):return json.loads((ROOT/(name+'.json')).read_text())
def main():
 base=read('coverage');cities=read('cities');refs=read('references');teams=read('team-coverage');venues=read('team-venues');tall=read('supertall-coverage');notes=read('design-notes');direct=read('city-example-coverage');direct_ids=set(direct['cityIdsWithDirectExamples'])
 covered=[c for c in cities if c['exampleIds'] or c['id'] in direct_ids];missing=[c for c in cities if not c['exampleIds'] and c['id'] not in direct_ids]
 rows=['# Architecture reference coverage','',f"Snapshot: {base['generatedAt']}",'','This is source-backed example retrieval. Model weights have not been trained. Counts below describe source records, not unique physical buildings or accurate 3D replicas.','',
 '| Dataset | Coverage |','| --- | --- |',f"| Wikidata building/venue records | {len(refs):,} ({sum(r['name']!=r['id'] for r in refs):,} named) |",f"| Residential class records | {base['counts'].get('residential',0):,}; houses, apartments, and other residences, not exclusively condos |",f"| Stadium/arena class records | {base['counts'].get('stadium',0):,} stadiums; {base['counts'].get('arena',0):,} arenas; categories may overlap |",f"| Supertall/megatall list rows | {sum(s['rowsImported'] for s in tall['sources']):,}; all rows of the fetched completed/topped-out tables |",f"| Team-directory venue records | {len(venues):,} |",f"| Researched form notes | {len(notes)}; remaining examples mostly have metadata |",f"| Populated places above 200,000 | {len(cities):,} |",f"| Places with a nearby or directly assigned building example | {len(covered):,} |",f"| Places without one in this snapshot | {len(missing):,} |",'',
 'A nearby example is within 25 km of the closest indexed place center. A direct example has a Wikidata administrative-location relation. Neither establishes measured municipal boundaries. Population dates vary. Source records can be stale or incomplete.','',
 '## Team-directory coverage','','These are source directory entries, not independently certified current-season rosters. Missing directory venue links may still have an unverified Wikidata alternative.','','| League | Teams | With venue link |','| --- | ---: | ---: |']
 for league in teams['leagues']:rows.append(f"| {league['league']} | {len(league['teams'])} | {sum(bool(t['venue']) for t in league['teams'])} |")
 rows+=['','Missing directory links:','']
 for league in teams['leagues']:
  for team in league['teams']:
   if not team['venue']:rows.append(f"- {league['league']}: {team['name']}")
 rows+=['','## Import failures','','A failed metadata batch does not delete the basic named record. It leaves those additional facts unavailable.','']
 failures=base['failures']+direct['failures']+teams['failures']
 if failures:
  rows += ['- '+json.dumps(f,ensure_ascii=False) for f in failures]
 else:rows.append('None in this snapshot.')
 rows+=['','## Cities still missing examples','','| Place | Country | Recorded population |','| --- | --- | ---: |']
 for c in sorted(missing,key=lambda c:(c['country'],c['name'])):rows.append(f"| {c['name'].replace('|','/')} | {c['country']} | {c['population']:,} |")
 rows+=['','Sources, licenses, and refresh commands: [README](README.md).','']
 (ROOT/'COVERAGE.md').write_text('\n'.join(rows))
 print('Cities with examples',len(covered),'of',len(cities),'missing',len(missing))
if __name__=='__main__':main()
