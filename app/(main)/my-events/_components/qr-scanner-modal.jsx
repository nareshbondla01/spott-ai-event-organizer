"use client";

import { useEffect, useState } from "react";
import {
  QrCode,
  Loader2,
  Camera,
  AlertCircle,
} from "lucide-react";

import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function QRScannerModal({
  isOpen,
  onClose,
}) {
  const [scannerReady, setScannerReady] =
    useState(false);

  const [error, setError] = useState("");

  const [isCheckingIn, setIsCheckingIn] =
    useState(false);

  const {
    mutate: checkInAttendee,
  } = useConvexMutation(
    api.registrations.checkInAttendee
  );

  /* ------------------------------------------------------------------------ */
  /* Check-In                                                                 */
  /* ------------------------------------------------------------------------ */

  const handleCheckIn = async (qrCode) => {
    if (!qrCode || isCheckingIn) {
      return;
    }

    setIsCheckingIn(true);

    try {
      const result =
        await checkInAttendee({
          qrCode: qrCode.trim(),
        });

      if (result.success) {
        toast.success(
          "Check-in successful!"
        );

        onClose();
      } else {
        toast.error(
          result.message ||
            "Check-in failed."
        );
      }
    } catch (error) {
      toast.error(
        error?.message ||
          "Invalid QR code."
      );
    } finally {
      setIsCheckingIn(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* QR Scanner                                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let scanner = null;
    let mounted = true;

    const initializeScanner =
      async () => {
        if (!isOpen) {
          return;
        }

        setScannerReady(false);
        setError("");

        try {
          /* ---------------------------------------------------------------- */
          /* Browser Support                                                   */
          /* ---------------------------------------------------------------- */

          if (
            typeof window ===
              "undefined" ||
            !navigator.mediaDevices ||
            !navigator.mediaDevices
              .getUserMedia
          ) {
            throw new Error(
              "Camera access is not supported by this browser."
            );
          }

          /* ---------------------------------------------------------------- */
          /* Camera Permission                                                 */
          /* ---------------------------------------------------------------- */

          try {
            const stream =
              await navigator.mediaDevices.getUserMedia(
                {
                  video: {
                    facingMode:
                      "environment",
                  },
                }
              );

            /*
             * We only requested the stream to
             * verify permission.
             *
             * html5-qrcode will create and
             * manage its own camera stream.
             */
            stream
              .getTracks()
              .forEach((track) =>
                track.stop()
              );
          } catch (permissionError) {
            console.error(
              "Camera permission error:",
              permissionError
            );

            throw new Error(
              "Camera permission was denied. Please allow camera access and try again."
            );
          }

          /* ---------------------------------------------------------------- */
          /* Dynamically Load QR Library                                      */
          /* ---------------------------------------------------------------- */

          const {
            Html5QrcodeScanner,
          } = await import(
            "html5-qrcode"
          );

          if (!mounted) {
            return;
          }

          /* ---------------------------------------------------------------- */
          /* Create Scanner                                                    */
          /* ---------------------------------------------------------------- */

          scanner =
            new Html5QrcodeScanner(
              "qr-reader",
              {
                fps: 10,

                qrbox: {
                  width: 250,
                  height: 250,
                },

                aspectRatio: 1,

                showTorchButtonIfSupported:
                  true,

                rememberLastUsedCamera:
                  true,

                supportedScanTypes: [
                  0,
                ],
              },
              false
            );

          /* ---------------------------------------------------------------- */
          /* Successful Scan                                                   */
          /* ---------------------------------------------------------------- */

          const onScanSuccess = async (
            decodedText
          ) => {
            if (
              !decodedText ||
              isCheckingIn
            ) {
              return;
            }

            console.log(
              "QR code detected:",
              decodedText
            );

            /*
             * Stop scanner immediately after
             * successful detection so the same
             * QR code is not scanned multiple times.
             */
            try {
              await scanner.clear();
            } catch (clearError) {
              console.debug(
                "Scanner cleanup:",
                clearError
              );
            }

            if (mounted) {
              setScannerReady(false);
            }

            await handleCheckIn(
              decodedText
            );
          };

          /* ---------------------------------------------------------------- */
          /* Scan Error                                                        */
          /* ---------------------------------------------------------------- */

          const onScanError = (
            scanError
          ) => {
            /*
             * html5-qrcode continuously reports
             * "QR code not found" while searching.
             *
             * We intentionally don't display
             * those messages to the user.
             */
            if (
              typeof scanError ===
                "string" &&
              scanError
                .toLowerCase()
                .includes(
                  "notfoundexception"
                )
            ) {
              return;
            }
          };

          /* ---------------------------------------------------------------- */
          /* Render Scanner                                                    */
          /* ---------------------------------------------------------------- */

          scanner.render(
            onScanSuccess,
            onScanError
          );

          if (mounted) {
            setScannerReady(true);
            setError("");
          }
        } catch (scannerError) {
          console.error(
            "QR scanner initialization failed:",
            scannerError
          );

          if (!mounted) {
            return;
          }

          setScannerReady(false);

          setError(
            scannerError?.message ||
              "Unable to start the camera."
          );

          toast.error(
            "Unable to start QR scanner."
          );
        }
      };

    initializeScanner();

    /* ---------------------------------------------------------------------- */
    /* Cleanup                                                                */
    /* ---------------------------------------------------------------------- */

    return () => {
      mounted = false;

      if (scanner) {
        scanner
          .clear()
          .catch((cleanupError) => {
            console.debug(
              "QR scanner cleanup error:",
              cleanupError
            );
          });

        scanner = null;
      }

      setScannerReady(false);
      setIsCheckingIn(false);
    };
  }, [isOpen]);

  /* ------------------------------------------------------------------------ */
  /* Dialog Close                                                             */
  /* ------------------------------------------------------------------------ */

  const handleDialogChange = (
    open
  ) => {
    if (!open) {
      onClose();
    }
  };

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <Dialog
      open={isOpen}
      onOpenChange={
        handleDialogChange
      }
    >
      <DialogContent className="sm:max-w-md">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-purple-500" />
            Check-In Attendee
          </DialogTitle>

          <DialogDescription>
            Scan the attendee&apos;s QR
            ticket to check them in.
          </DialogDescription>
        </DialogHeader>

        {/* ------------------------------------------------------------------ */}
        {/* Scanner Area                                                       */}
        {/* ------------------------------------------------------------------ */}

        <div className="relative">

          <div
            id="qr-reader"
            className="w-full overflow-hidden rounded-lg"
            style={{
              minHeight: "300px",
            }}
          />

          {/* Loading */}
          {!scannerReady &&
            !error &&
            !isCheckingIn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />

                <p className="text-sm text-muted-foreground">
                  Starting camera...
                </p>
              </div>
            )}

          {/* Checking In */}
          {isCheckingIn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />

              <p className="font-medium">
                Checking in attendee...
              </p>
            </div>
          )}

        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Error                                                               */}
        {/* ------------------------------------------------------------------ */}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">

            <div className="flex items-start gap-3">

              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />

              <div className="space-y-1">

                <p className="font-medium text-red-700">
                  Camera unavailable
                </p>

                <p className="text-sm text-red-600">
                  {error}
                </p>

              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Instructions                                                        */}
        {/* ------------------------------------------------------------------ */}

        {!error && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground text-center">

            <Camera className="w-4 h-4" />

            <span>
              {scannerReady
                ? "Position the attendee's QR code inside the frame."
                : "Please allow camera access when prompted."}
            </span>

          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}