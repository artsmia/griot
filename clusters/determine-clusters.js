// http://caption-search.dx.artsmia.org/ids/45269,4866,1312,108767,113136,111099,97,111879,1854,12111,1937,3778,115514,115320,1358,111088,114833,111893,12092,376,105014,117153,3520,91467,7505,5788,4324,114429,118304,116725,108860,60728,4379,1380,4829,22412,107241,116294,113926,1704,1721,2210,2606,537,1218,1978,4418,10436,529,109122,278,1270,1348,1727,1355,115836,1411,1244,1748,8023,1226,119599,115352,113568,1637,1629,116116,98653,114514,109112,43877
var objects = require("./objects.json")
var locations = "G200 G219 G223 G230 G258 G260 G261 G321 G340 G350 G363 G374 G375 G379 G236 G250 G254".split(' ')

objectLocations = objects.map(function(o) { return o.room })

// console.log('cube locations', locations)
// console.log('object locations', objectLocations)

var groups = {}
var id = function(o) { return o.id }

// How to group the artstories??
// Location-wise I want to do it by the gallery number.
// So first, 'Not on View'

groups.offView = objects.filter(function(o) { return o.room == 'Not on View' }).map(id)

// The simplest possible grouping now is by floor…

groups.floor1 = objects.filter(function(o) { return o.room.match(/^G1/) }).map(id)
groups.floor2 = objects.filter(function(o) { return o.room.match(/^G2/) }).map(id)
groups.floor3 = objects.filter(function(o) { return o.room.match(/^G3/) }).map(id)

// I want to group them according to the closest gallery-located iPads
// `locations`

function galleryDistance(a, b) {
  if(a == 'Not on View' || b == 'Not on View') return 1000
  a = parseInt(a.replace('G', ''))
  b = parseInt(b.replace('G', ''))
  return Math.abs(a-b);
}

function findClusters(object, threshold) {
  var objectLocation = object.room
  // How far is it to the existing clusters?
  var clusterDistances = locations.map(function(clusterLocation) {
    return galleryDistance(objectLocation, clusterLocation)
  })
  return clusterDistances.map(function(d, i) {
    if(d <= threshold) return locations[i]
  }).filter(function(cluster) { return cluster })
}

var clusters = locations.reduce(function(clusters, location) {
  clusters[location] = []
  return clusters
}, {})

// find the 'nearest' clusters for each object
objects.map(function(o) {
  findClusters(o, 25).map(function(cluster) {
    clusters[cluster].push(o.id)
  })
})

// TODO: sort objects in clusters by lowest distance

clusters.offView = groups.offView

console.log(JSON.stringify(clusters))
