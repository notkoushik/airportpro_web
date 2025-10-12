package com.example.passportreaderdemo

import android.nfc.tech.IsoDep
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class PassportViewModel : ViewModel() {

    private val repository = PassportRepository()

    // Private mutable state flow for internal updates
    private val _uiState = MutableStateFlow<UIState>(UIState.Idle)
    // Public immutable state flow for the UI to observe
    val uiState: StateFlow<UIState> = _uiState

    fun readPassport(isoDep: IsoDep, mrzInfo: MrzInfo) {
        viewModelScope.launch {
            _uiState.value = UIState.Loading
            try {
                val passportDetails = repository.readPassport(isoDep, mrzInfo)
                _uiState.value = UIState.Success(passportDetails)
            } catch (e: Exception) {
                _uiState.value = UIState.Error(e.message ?: "An unknown error occurred")
            }
        }
    }

    fun resetState() {
        _uiState.value = UIState.Idle
    }
}