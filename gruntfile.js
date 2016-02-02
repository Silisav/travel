module.exports = function(grunt) {
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
			dist: {	// Target 
	            // this is the "dev" Sass config used with "grunt watch" command
	            options: {
	                style: 'compressed',
	                loadPath: 'node_modules/bootstrap-sass/assets/stylesheets'
	            },
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
		        src: ['**/*.{png,jpg,gif}'],
		        dest: 'dist/'
		      }]
		    }
		},

		copy: {
		  files: {
		  	cwd: 'src',  // set working folder / root to copy
		    src: 'index.html',	// copy all html files
		    dest: 'dist',	// destination folder
		    expand: true
		  },
		},

		// Empty out the contents of dist for a fresh build
		clean: {
			all: ['dist/']
		},

		processhtml: {
			dist: {
			  files: {
			    'dist/index.html': ['src/index.html']
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
				files: 'src/index.html',
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
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-imagemin');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-processhtml');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-browser-sync');

	grunt.registerTask('default', ['jshint', 'clean:all', 'uglify', 'sass', 'cssmin', 'imagemin', 'copy', 'processhtml', 'browserSync', 'watch']);
};