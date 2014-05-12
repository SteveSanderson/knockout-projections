/*
------------------------------------------------------------------------------
Copyright (c) Microsoft Corporation
All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 
THIS CODE IS PROVIDED *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT.
See the Apache Version 2.0 License for specific language governing permissions and limitations under the License.
------------------------------------------------------------------------------
*/

module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');
    grunt.initConfig({
        pkg: pkg,
        jshint: {
            all: ['src/knockout-projections.js'],
            options: {
                globals: {
                    module: true,
                    require: true,
                    define: true
                },  
  
                // Restrictions
                curly: true,
                eqeqeq: true,
                indent: 4,
                latedef: true,
                newcap: true,
                noempty: true,
                quotmark: 'single',
                undef: true,
                unused: true,
                strict: true,
                trailing: true,  

                // Allowances
                validthis: true,  
  
                // Environments
                browser: true,
            }
        },
        concat: {
            options: {
                process: function(src) {
                    return src.replace('@@version@@', pkg.version);
                }
            },
            dist: {
                src: ['src/knockout-projections.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                preserveComments: 'some'
            },
            build: {
                src: 'dist/<%= pkg.name %>.js',
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },
        'string-replace': {
            dist: {
                files: {
                    'package.nuspec': 'package.nuspec'
                },
                options: {
                    replacements: [{ pattern: /<version>.*?<\/version>/, replacement: '<version><%= pkg.version %></version>' }]
                }
            }
        },
        jasmine_node: {
            specNameMatcher: "spec",
            projectRoot: ".",
            requirejs: false,
            useHelpers: true,
            forceExit: true
        },
        watch: {
            scripts: {
                files: ['src/*.js', 'spec/*.js'],
                tasks: ['default'],
                options: { nospawn: false }
            },
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-jasmine-node');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-string-replace');

    grunt.registerTask('test', ['jasmine_node']);
    grunt.registerTask('build', ['concat', 'string-replace', 'uglify']);
    grunt.registerTask('default', ['jshint', 'test', 'build']);
};
