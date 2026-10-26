// swift-tools-version: 5.9
import PackageDescription

// Logifi: Apple Sign In only — no Facebook/Google SPM products (avoids FBSDK dyld init on cold launch).
// Applied by scripts/configure-social-login-spm.mjs from capacitor.config.json SocialLogin.providers.
let package = Package(
    name: "CapgoCapacitorSocialLogin",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapgoCapacitorSocialLogin",
            targets: ["SocialLoginPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/Alamofire/Alamofire.git", .upToNextMajor(from: "5.11.2"))
    ],
    targets: [
        .target(
            name: "SocialLoginPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "Alamofire", package: "Alamofire")
            ],
            path: "ios/Sources/SocialLoginPlugin"),
        .testTarget(
            name: "SocialLoginPluginTests",
            dependencies: ["SocialLoginPlugin"],
            path: "ios/Tests/SocialLoginPluginTests")
    ]
)
