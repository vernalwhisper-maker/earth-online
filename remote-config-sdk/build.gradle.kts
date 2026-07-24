plugins {
    kotlin("jvm") version "1.9.22"
    kotlin("plugin.serialization") version "1.9.22"
}

group = "com.earthonline.remoteconfig"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    // Kotlin 序列化（JSON 解析）
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")

    // Kotlin 协程（异步网络请求）
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")

    // 测试
    testImplementation("org.jetbrains.kotlin:kotlin-test:1.9.22")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
    testImplementation("io.mockk:mockk:1.13.10")
}

// 配置 Java 目标版本
kotlin {
    jvmToolchain(17)
}
