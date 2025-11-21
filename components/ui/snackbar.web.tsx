import {
  SnackbarMessage,
  SnackbarType,
  useSnackbar,
} from "@/context/snackbar-context";
import MuiAlert, { AlertColor, AlertProps } from "@mui/material/Alert";
import MuiSnackbar from "@mui/material/Snackbar";
import React, { SyntheticEvent, useEffect, useState } from "react";

// This is an Alert component that uses forwardRef,
// which is required for integration with Snackbar.
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export function Snackbar() {
  const { snackbar, hideSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [currentSnackbar, setCurrentSnackbar] =
    useState<SnackbarMessage | null>(null);

  useEffect(() => {
    console.log("--- Web Snackbar received snackbar prop ---", snackbar); // Added log
    if (snackbar) {
      setCurrentSnackbar(snackbar);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [snackbar]);

  const handleClose = (event?: SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
    // Only hide the snackbar in context AFTER the MUI Snackbar has closed its animation
    // This prevents a flash of content if a new snackbar comes in immediately
    // after the previous one was told to close.
    if (
      currentSnackbar &&
      snackbar?.message === currentSnackbar.message &&
      snackbar?.type === currentSnackbar.type
    ) {
      hideSnackbar();
    }
  };

  const customColors: Record<
    SnackbarType,
    { backgroundColor: string; color: string }
  > = {
    success: {
      backgroundColor: "#d4edda", // soft green
      color: "#155724", // dark green text
    },
    error: {
      backgroundColor: "#f8d7da", // soft red
      color: "#721c24", // dark red text
    },
    info: {
      backgroundColor: "#d1ecf1", // soft blue
      color: "#0c5460", // dark blue text
    },
    warning: {
      backgroundColor: "#fff3cd", // soft orange
      color: "#856404", // dark orange text
    },
  };

  const alertStyle = {
    width: "100%",
    borderRadius: "12px", // Increased border radius
    ...(currentSnackbar?.type && customColors[currentSnackbar.type]
      ? {
          backgroundColor: customColors[currentSnackbar.type].backgroundColor,
          color: customColors[currentSnackbar.type].color,
          "& .MuiAlert-icon": {
            color: customColors[currentSnackbar.type].color,
          },
          "& .MuiAlert-message": {
            color: customColors[currentSnackbar.type].color,
          },
          "& .MuiButton-root": {
            color: customColors[currentSnackbar.type].color,
          },
          "& .MuiSvgIcon-root": {
            color: customColors[currentSnackbar.type].color,
          },
        }
      : {}),
  };

  if (!currentSnackbar) {
    return null;
  }

  const { message, type, duration } = currentSnackbar;

  return (
    <MuiSnackbar
      open={open}
      autoHideDuration={duration || 4000} // Default duration to 4 seconds if not specified
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={handleClose}
        severity={type as AlertColor}
        sx={alertStyle}
      >
        {message}
      </Alert>
    </MuiSnackbar>
  );
}
