/**
 * client-examples/AndroidKeyActivation.kt
 *
 * Exemplo pronto de integracao para um app Android (Kotlin).
 * Usa apenas bibliotecas padrao do Android (SharedPreferences + HttpURLConnection)
 * para nao depender de nenhuma lib externa. Se seu projeto ja usa Retrofit/OkHttp,
 * adapte a parte de rede mantendo a mesma logica.
 *
 * IMPORTANTE: o deviceId e um UUID aleatorio gerado pelo proprio app na primeira
 * execucao -- NAO e o IMEI, numero de serie, Android ID de hardware ou MAC Address.
 */

package com.seuapp.licensing

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.io.OutputStreamWriter
import java.io.BufferedReader
import java.io.InputStreamReader

// -----------------------------------------------------------------------
// CONFIGURACAO -- troque pela URL real do seu servidor
// -----------------------------------------------------------------------
private const val API_BASE_URL = "https://seu-servidor.com"
private const val PREFS_NAME = "license_prefs"
private const val PREF_DEVICE_ID = "device_id"
private const val PREF_LICENSE_KEY = "license_key"

data class ActivationResult(
    val valid: Boolean,
    val message: String,
    val expiresAt: String? // null quando a licenca e permanente ou em caso de erro
)

object KeyActivationManager {

    // ---------------------------------------------------------------
    // 1. Gera (ou le) um deviceId aleatorio salvo localmente
    // ---------------------------------------------------------------
    fun getOrCreateDeviceId(context: Context): String {
        val prefs = getPrefs(context)
        var deviceId = prefs.getString(PREF_DEVICE_ID, null)

        if (deviceId == null) {
            deviceId = UUID.randomUUID().toString()
            prefs.edit().putString(PREF_DEVICE_ID, deviceId).apply()
        }

        return deviceId
    }

    fun getSavedLicenseKey(context: Context): String? {
        return getPrefs(context).getString(PREF_LICENSE_KEY, null)
    }

    fun saveLicenseKey(context: Context, key: String) {
        getPrefs(context).edit().putString(PREF_LICENSE_KEY, key).apply()
    }

    fun clearSavedLicenseKey(context: Context) {
        getPrefs(context).edit().remove(PREF_LICENSE_KEY).apply()
    }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // ---------------------------------------------------------------
    // 2 e 3. Envia Key + deviceId para a API (chamar em uma thread de
    // background -- ex: Coroutine com Dispatchers.IO -- nunca na main thread)
    // ---------------------------------------------------------------
    fun activateLicenseKey(context: Context, key: String): ActivationResult {
        val deviceId = getOrCreateDeviceId(context)

        return try {
            val url = URL("$API_BASE_URL/api/keys/activate")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000

            val body = JSONObject().apply {
                put("key", key.trim().uppercase())
                put("deviceId", deviceId)
            }

            OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }

            val responseCode = connection.responseCode
            val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
            val responseText = BufferedReader(InputStreamReader(stream)).use { it.readText() }

            val json = JSONObject(responseText)
            ActivationResult(
                valid = json.optBoolean("valid", false),
                message = json.optString("message", "Erro desconhecido."),
                expiresAt = if (json.isNull("expiresAt")) null else json.optString("expiresAt")
            )
        } catch (e: Exception) {
            ActivationResult(
                valid = false,
                message = "Nao foi possivel conectar ao servidor de licenciamento. Verifique sua internet."
            )
        }
    }

    // ---------------------------------------------------------------
    // 4. Exemplo de fluxo completo de verificacao de acesso
    // ---------------------------------------------------------------
    // Chame isto a partir de uma Coroutine, por exemplo:
    //
    // lifecycleScope.launch(Dispatchers.IO) {
    //     val result = KeyActivationManager.verificarAcesso(context, "KEY-XXXX-XXXX-XXXX-XXXX")
    //     withContext(Dispatchers.Main) {
    //         if (result.valid) irParaTelaPrincipal() else mostrarErro(result.message)
    //     }
    // }
    fun verificarAcesso(context: Context, keyDigitadaPeloUsuario: String? = null): ActivationResult {
        val key = keyDigitadaPeloUsuario ?: getSavedLicenseKey(context)
        ?: return ActivationResult(false, "Nenhuma Key informada.", null)

        val result = activateLicenseKey(context, key)

        if (result.valid) {
            saveLicenseKey(context, key.trim().uppercase())
        } else {
            clearSavedLicenseKey(context)
        }

        return result
    }
}

/*
 * Mensagens de erro possiveis retornadas pela API (campo "message"):
 *  - "Key invalida."
 *  - "Esta Key foi revogada."
 *  - "Esta Key esta expirada."
 *  - "Esta Key ja esta vinculada a outro dispositivo."
 *  - "Nao foi possivel conectar ao servidor de licenciamento. Verifique sua internet."
 */
