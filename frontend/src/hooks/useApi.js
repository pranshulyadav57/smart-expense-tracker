import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../services/api";

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const reset = useCallback(() => {
    setError("");
    setData(null);
  }, []);

  const execute = useCallback(
    async (apiCall, options = {}) => {
      const {
        loadingMessage,
        successMessage,
        showSuccessToast = true,
        showErrorToast = true,
        showToast = true, // Legacy option for backward compatibility
        toastMessages = {}, // New option for more control
        onSuccess,
        onError,
      } = options;

      try {
        setLoading(true);
        setError("");

        let toastId;

        // Handle loading message (supports both old and new style)
        const actualLoadingMessage = loadingMessage || toastMessages?.loading;
        if (actualLoadingMessage && (showToast && showErrorToast)) {
          toastId = toast.loading(actualLoadingMessage);
        }

        const result = await (typeof apiCall === "function" ? apiCall() : apiCall);
        setData(result);

        if (toastId) {
          toast.dismiss(toastId);
        }

        // Handle success message
        const actualSuccessMessage = successMessage || toastMessages?.success;
        if (actualSuccessMessage && showSuccessToast && (showToast && showErrorToast)) {
          toast.success(actualSuccessMessage);
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const message = getErrorMessage(err);

        setError(message);

        // Handle error message (supports both old and new style)
        const actualErrorMessage = toastMessages?.error || message;
        if (showErrorToast && showToast) {
          toast.error(actualErrorMessage);
        }

        if (onError) {
          onError(err);
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
}