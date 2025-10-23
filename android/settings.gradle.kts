pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        
        // Node.js repository for node-gradle plugin
        ivy {
            name = "Node.js"
            setUrl("https://nodejs.org/dist/")
            patternLayout {
                artifact("v[revision]/[artifact](-v[revision]-[classifier]).[ext]")
            }
            metadataSources {
                artifact()
            }
            content {
                includeModule("org.nodejs", "node")
            }
        }
        
        // flatDir for Capacitor plugins
        flatDir {
            dirs("../capacitor-cordova-android-plugins/src/main/libs", "libs")
        }
    }
}

rootProject.name = "airportpro"
include(":app")

// Capacitor: Load dynamic Cordova plugin configuration
apply(from = "capacitor.settings.gradle")
