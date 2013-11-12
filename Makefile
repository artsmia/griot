json:
	curl -L http://new.artsmia.org/crashpad/json > fallback/crashpad.json
	curl -L http://new.artsmia.org/miabeckmann/json > fallback/beckmann.json

merge_beckmann:
	echo 'todo'

cdnify: json
	scp fallback/crashpad.json dx:/apps/cdn/crashpad.json
	scp fallback/crashpad.json dxt:/apps/cdn/crashpad.json

images_used: fallback/crashpad.json
	cat fallback/crashpad.json | jq '.objects[].views[].image, .stories[].pages[].image, .stories[].pages[].imageB' | uniq | tr -d null | tr -s '\n' | tr -d \"

all_goldweights_ids: fallback/crashpad.json
	cat fallback/crashpad.json | jq '.objects["196"].views[].annotations[].attachments' | json -g | jq '.[]' | sed 's/"//g' | tr -s ' ' | cut -d' ' -f2
