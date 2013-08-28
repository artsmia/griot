module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        // define a string to put between each file in the concatenated output
        separator: ';'
      },
      dist: {
        // the files to concatenate
        //src: ['javascripts/*.js'],

        src: [
          'javascripts/jquery-2.0.1.min.js',
          'javascripts/underscore-min.js',
          'javascripts/leaflet-src.js',
          'javascripts/zoom_swipe.js',
          'javascripts/jquery.actual.min.js',
          'javascripts/flat_image_zoom.js',
        ],
        // the location of the resulting JS file
        dest: 'build/<%= pkg.name %>.js'
      }
    },

    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        browser: true,
        globals: {
          jQuery: true
        },
      },

      files: {
        src: [ ]
      }
    },

    uglify: {
      options: {
        // the banner is inserted at the top of the output
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n',
        //report : 'gzip',
        // to help optimize the varibale names and stuff like that
        //compress : true
      },
      dist: {
        files: {
          'build/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },

    watch: {
      files: ['javascripts/*.js'],
      tasks: ['concat', 'uglify'],
    }

  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-compass');

  // Default task(s).
  grunt.registerTask('default', ['concat', 'uglify']);
};
