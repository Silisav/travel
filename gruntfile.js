module.exports = function(grunt) {
	const sass = require('node-sass');
	
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		jshint: {
			options: {
				reporter: require('jshint-stylish'),
				force: true
			},
			build: ['Gruntfile.js', 'src/**/*.js']
		},

		uglify: {
			build: {
				files: [{
			          expand: true,
			          cwd: 'src/js',
			          src: '**/*.js',
			          dest: 'dist/js'
			    }]
			}
		},

		sass: {
			// Target
	    // this is the "dev" Sass config used with "grunt watch" command
	    options: {
				implementation: sass,
				style: 'compressed',
				includePaths: [ 'node_modules/bootstrap-sass/assets/stylesheets' ]
	    },
			dist: {
				files: {
	          'dist/css/style.css': 'src/sass/style.scss'
	      }
			}	            
    },

		cssmin: {
			build: {
				files: [{
					      expand: true,
					      cwd: 'src/sass',
					      src: ['*.css', '!*.min.css'],
					      dest: 'dist/css',
					      ext: '.min.css'
					    }]
			}
		},

		imagemin: {
			dynamic: {
		      files: [{
		        expand: true,
		        cwd: 'src/',
		        src: ['**/*.{png,jpg,jpeg,gif}'],
		        dest: 'dist/'
		      }]
		    }
		},

		copy: {
		    main: {
		        files: [
		            // includes files within path
		            {
		                expand: true,
		                cwd: 'src',
		                src: 'img/icons/*.css',
		                dest: 'dist/'
		            },
		            {
		                expand: true,
		                cwd: 'src',
		                src: 'img/favicon/*',
		                dest: 'dist/'
		            },
								{
		                expand: true,
		                cwd: 'src',
		                src: 'videos/*',
		                dest: 'dist/'
		            },
		            // makes all src relative to cwd
		            {
		                expand: true,
		                cwd: 'src',
		                src: ['index.html', 'map.html', 'japan.html', 'vietnam.html', 'cambodia.html', 'thailand.html', 'malaysia.html', 'indonesia.html', 'greece.html'],
		                dest: 'dist'
		            },
		        ],
		    },
		},

		// Empty out the contents of dist for a fresh build
		clean: {
			all: ['dist/']
		},

		processhtml: {
			dist: {
			  files: {
			    'dist/index.html': ['src/index.html'],
			    'dist/map.html': ['src/map.html'],
			    'dist/japan.html': ['src/japan.html'],
			    'dist/vietnam.html': ['src/vietnam.html'],
			    'dist/cambodia.html': ['src/cambodia.html'],
			    'dist/thailand.html': ['src/thailand.html'],
			    'dist/malaysia.html': ['src/malaysia.html'],
			    'dist/indonesia.html': ['src/indonesia.html'],
			    'dist/greece.html': ['src/greece.html']
			  }
			}
		},

		browserSync: {
		    bsFiles: {
			    src : [
	                'dist/css/*.css',
	                'dist/js/*.js',
	                'dist/img/*.{png,jpg,gif}',
	                'dist/*.html'
	            	]
            },
		    options: {
		    	watchTask: true,
		        server: {
				    baseDir: "dist",
				    index: "index.html"
				},
		        port: 9080
		    },

		},

		watch: {
			stylesheets: {
				files: ['src/**/*.css', 'src/**/*.scss'],
				tasks: ['sass', 'cssmin']
			},
			scripts: {
				files: 'src/**/*.js',
				tasks: ['jshint', 'uglify']
			},
			html: {
				files: 'src/*.html',
				tasks: 'copy'
			},
			includes: {
				files: 'src/*.html',
				tasks: ['processhtml']
			},
			images: {
				files: ['src/**/*.png', 'src/**/*.jpg', 'src/**/*.gif'],
				tasks: 'imagemin'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-sass');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-imagemin');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-processhtml');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-browser-sync');

	grunt.registerTask('default', ['jshint', 'clean:all', 'uglify', 'sass', 'cssmin', 'imagemin', 'copy', 'processhtml', 'browserSync', 'watch']);
	grunt.registerTask('dist', ['jshint', 'clean:all', 'uglify', 'sass', 'cssmin', 'imagemin', 'copy', 'processhtml']);
};
