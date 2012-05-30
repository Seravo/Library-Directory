/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // the staging directory used during the process
    staging: 'staging',
    // final build output
    output: 'output',
    exclude: '',
    mkdirs: {
      staging: '<config:exclude>'
    },
/*
    less: {
        all: {
            src: '*.less',
            dest: 'css/style.css',
            options: {
                compress: true
            }
        }
    },
*/
    // concat css/**/*.css files, inline @import, output a single minified css
    // Otto: but minify does not seem to work?
    css: {
      'css/compressed.css': ['css/style.css', 'js/libs/facetview.css', 'js/libs/jquery-ui-1.8.18.custom/*.css' ]
      // no openlayers included
    },
    // Renames JS/CSS to prepend a hash of their contents for easier
    // versioning
    rev: {
      js: 'js/compressed.js',
      css: 'css/compressed.css',
      img: 'img/none'
    },
    // update references in html to revved files
    usemin: {
       html: ['views/*.mustache'],
        // css: ['**/*.css'] // not needed in this project, images very rarely change
    },
    // html minification - too dangerous for mustache templates?
    // html: '<config:usemin>',
    // Optimizes JPGs and PNGs (with jpegtran & optipng)
    img: {
      dist: '<config:rev.img>'
    },
    watch: {
      files: ['js/**', 'css/**', 'views/**'],
      tasks: 'default',

      reload: {
        files: '<config:watch.files>',
        tasks: 'default'
      }
    },
    
    pkg: '<json:package.json>',
    meta: {
      banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */'
    },
    lint: {
      files: ['grunt.js', 'js/**/*.js', 'test/**/*.js']
    },
    qunit: {
      files: ['test/**/*.html']
    },
    concat: {
      dist: {
        src: [
        'js/libs/bootstrap/bootstrap.min.js',
        'js/libs/bootstrap/transition.js',
        'js/libs/bootstrap/collapse.js',
        'js/libs/jquery-ui-1.8.18.custom/jquery-ui-1.8.18.custom.min.js',
        'js/libs/mustache/mustache.js',
        'js/libs/linkify/1.0/jquery.linkify-1.0-min.js',
        'js/libs/d3/d3.min.js',
        'js/libs/d3/d3.geom.min.js',
        'js/libs/d3/d3.layout.min.js',
        'js/libs/jquery.facetview.js',
//        'js/libs/openlayers/openlayers.js',
        'js/plugins.js',
        'js/script.js'
        ],
        dest: 'js/temp.js',
        separator: ';'
      }
    },
    min: {
      dist: {
        src: 'js/temp.js',
        dest: 'js/compressed.js'
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      },
      globals: {
        jQuery: true
      }
    },
    uglify: {}
  });

// does not work even when installed?
//  grunt.loadNpmTasks('grunt-less');
//  grunt.registerTask('default', 'intro clean mkdirs concat less css min img rev usemin manifest copy time');
  grunt.registerTask('default', 'intro clean mkdirs concat min css img rev usemin manifest copy time');
  grunt.registerTask('reload', 'default watch:reload');
  
  // if "h5bp reload" fails with message "Error: watch EMFILE"
  // it means the number of open files has exceeded
  // lift limit by runnig as root
  // $ echo 8704 > /proc/sys/fs/inotify/max_user_instances
};


