app.filter('titleCase', function () {
  return function (input) {
    var words = input.replace('_', ' ').split(' ');
    for (var i = 0; i < words.length; i++) {
      words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    return words.join(' ');
  } // https://gist.github.com/maruf-nc/5625869
});