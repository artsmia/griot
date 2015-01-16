default: sass browserify

.PHONY: sass
sass:
	sass --watch -t compact sass/all.scss:css/style.css

browserify:
	browserify --full-path=false js/app.js -o js/bundle.js

watchify:
	watchify --full-path=false js/app.js -o js/bundle.js

cdnify:
	curl -L http://new.artsmia.org/crashpad/json > fallback/crashpad.json
	scp fallback/crashpad.json dx:/apps/cdn/crashpad.json
	scp fallback/crashpad.json dxt:/apps/cdn/crashpad.json

images_used: fallback/crashpad.json
		cat fallback/crashpad.json | jq '.objects[].views[].image, .stories[].pages[].image, .stories[].pages[].imageB' | uniq | tr -d null | tr -s '\n' | tr -d \"

all_goldweights_ids: fallback/crashpad.json
		cat fallback/crashpad.json | jq '.objects["196"].views[].annotations[].attachments' | json -g | jq '.[]' | sed 's/"//g' | tr -s ' ' | cut -d' ' -f2
