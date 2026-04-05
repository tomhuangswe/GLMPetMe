package com.petmeapp

import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

/**
 * TtsModule
 *
 * 封装 Android 系统内置 TextToSpeech 引擎，供 JS 层调用。
 * - speak(text, locale, pitch)：朗读文字；pitch < 1.0 音调低（偏男声），> 1.0 偏高（偏女声）
 * - stop()：立即停止当前朗读
 * 兼容 React Native New Architecture（不依赖任何第三方 TTS 库）。
 */
class TtsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "TtsModule"
        const val UTTERANCE_ID = "petme_tts"
    }

    private var tts: TextToSpeech? = null
    private var isReady = false

    init {
        // 使用 applicationContext 避免 Activity 泄漏
        tts = TextToSpeech(reactContext.applicationContext) { status ->
            isReady = (status == TextToSpeech.SUCCESS)
        }
    }

    override fun getName(): String = NAME

    /**
     * 朗读文字
     * @param text   要朗读的文字
     * @param locale 语言区域，如 "zh-CN"、"en-US"
     * @param pitch  音调倍率（男声建议 0.85，女声建议 1.15，默认 1.0）
     */
    @ReactMethod
    fun speak(text: String, locale: String, pitch: Double, speechRate: Double, promise: Promise) {
        val engine = tts
        if (engine == null || !isReady) {
            promise.reject("TTS_NOT_READY", "TTS 引擎未初始化，请稍后重试")
            return
        }

        // 设置语言；若不支持则降级到设备默认语言
        val langResult = engine.setLanguage(Locale.forLanguageTag(locale))
        if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            engine.setLanguage(Locale.getDefault())
        }

        engine.setPitch(pitch.toFloat())
        engine.setSpeechRate(speechRate.toFloat())

        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) { promise.resolve(null) }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                promise.reject("TTS_ERROR", "朗读失败")
            }
        })

        engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, UTTERANCE_ID)
    }

    /** 立即停止当前朗读 */
    @ReactMethod
    fun stop(promise: Promise) {
        tts?.stop()
        promise.resolve(null)
    }

    /** 组件销毁时释放 TTS 资源 */
    override fun invalidate() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isReady = false
        super.invalidate()
    }
}
