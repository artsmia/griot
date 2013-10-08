cdnify:
	curl -L http://new.artsmia.org/crashpad/json > fallback/crashpad.json
	scp fallback/crashpad.json dx:/apps/cdn/crashpad.json
	scp fallback/crashpad.json dxt:/apps/cdn/crashpad.json

