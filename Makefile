default: sass browserify

.PHONY: sass
sass:
	onchange css/style.css -- sh -c 'cat fonts/fontello/css/griot-em* css/vendor/leaflet.css css/style.css css/goldweights.css > css/bundle.css' &
	sass --watch -t compact sass/all.scss:css/style.css

browserify:
	browserify --full-path=false js/app.js | uglifyjs > js/bundle.js

build: browserify
	ls -S js/vendor/{angular*,isotope*,masonry*}.js | xargs cat | uglifyjs > js/deps.js
	cat js/vendor/jquery-2.1.0.min.js js/vendor/flat_image_zoom/javascripts/{leaflet-src.js,flat_image_zoom.js,jquery.actual.min.js} js/overscroll.js | uglifyjs > js/zooming.js
	cat fonts/fontello/css/griot-em* css/vendor/leaflet.css css/style.css css/goldweights.css > css/bundle.css

watchify:
	watchify --full-path=false js/app.js -v -o js/bundle.js

cdnify:
	curl -L http://new.artsmia.org/crashpad/json > fallback/crashpad.json
	scp fallback/crashpad.json dx:/apps/cdn/crashpad.json
	scp fallback/crashpad.json dxt:/apps/cdn/crashpad.json

images_used: fallback/crashpad.json
		cat fallback/crashpad.json | jq '.objects[].views[].image, .stories[].pages[].image, .stories[].pages[].imageB' | uniq | tr -d null | tr -s '\n' | tr -d \"

all_goldweights_ids: fallback/crashpad.json
		cat fallback/crashpad.json | jq '.objects["196"].views[].annotations[].attachments' | json -g | jq '.[]' | sed 's/"//g' | tr -s ' ' | cut -d' ' -f2
