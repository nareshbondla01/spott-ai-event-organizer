"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Loader2,
  Upload,
  ImageIcon,
  X,
} from "lucide-react";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UnsplashImagePicker({
  isOpen,
  onClose,
  onSelect,
}) {
  const fileInputRef = useRef(null);

  /* ------------------------------------------------------------------------ */
  /* Convex                                                                   */
  /* ------------------------------------------------------------------------ */

  const generateUploadUrl = useMutation(
    api.storage.generateUploadUrl
  );

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [query, setQuery] = useState("event");

  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [previewUrl, setPreviewUrl] = useState("");

  const [storageId, setStorageId] = useState(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* Get permanent Convex storage URL                                        */
  /* ------------------------------------------------------------------------ */

  const storageUrl = useQuery(
    api.storage.getStorageUrl,
    storageId
      ? {
          storageId,
        }
      : "skip"
  );

  /* ------------------------------------------------------------------------ */
  /* When Convex returns the permanent URL                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!storageId) {
      return;
    }

    if (!storageUrl) {
      return;
    }

    /*
     * IMPORTANT:
     *
     * This is now a permanent Convex Storage URL.
     * This is what gets saved into events.coverImage.
     */
    onSelect(storageUrl);

    setUploading(false);

    /*
     * The permanent URL is ready.
     * We no longer need the local preview.
     */
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    setStorageId(null);

    onClose();
  }, [
    storageId,
    storageUrl,
    previewUrl,
    onSelect,
    onClose,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Cleanup local preview                                                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /* ------------------------------------------------------------------------ */
  /* Reset dialog state                                                       */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage("");
      setUploading(false);
      setLoading(false);
      setStorageId(null);
    }
  }, [isOpen]);

  /* ------------------------------------------------------------------------ */
  /* Unsplash Search                                                          */
  /* ------------------------------------------------------------------------ */

  const searchImages = async (searchQuery) => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setErrorMessage(
        "Please enter something to search."
      );
      return;
    }

    const accessKey =
      process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      setErrorMessage(
        "Unsplash is not configured. You can still upload an image from your gallery."
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          trimmedQuery
        )}&per_page=12&client_id=${accessKey}`
      );

      if (!response.ok) {
        throw new Error(
          `Unsplash request failed: ${response.status}`
        );
      }

      const data = await response.json();

      setImages(
        Array.isArray(data.results)
          ? data.results
          : []
      );
    } catch (error) {
      console.error(
        "Error fetching Unsplash images:",
        error
      );

      setImages([]);

      setErrorMessage(
        "Unable to load Unsplash images. Please try again or upload a photo from your gallery."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Search Submit                                                            */
  /* ------------------------------------------------------------------------ */

  const handleSearch = async (event) => {
    event.preventDefault();

    await searchImages(query);
  };

  /* ------------------------------------------------------------------------ */
  /* Open Gallery                                                             */
  /* ------------------------------------------------------------------------ */

  const handleOpenGallery = () => {
    if (!fileInputRef.current) {
      return;
    }

    fileInputRef.current.click();
  };

  /* ------------------------------------------------------------------------ */
  /* Gallery Upload                                                           */
  /* ------------------------------------------------------------------------ */

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    /*
     * Reset input so the same image can be selected again.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    setErrorMessage("");

    /* ---------------------------------------------------------------------- */
    /* Validate image type                                                    */
    /* ---------------------------------------------------------------------- */

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please select a valid image file."
      );
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Validate image size                                                    */
    /* ---------------------------------------------------------------------- */

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setErrorMessage(
        "Image must be smaller than 10 MB."
      );
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Create local preview                                                   */
    /* ---------------------------------------------------------------------- */

    const localUrl =
      URL.createObjectURL(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      /* -------------------------------------------------------------------- */
      /* Step 1: Ask Convex for upload URL                                    */
      /* -------------------------------------------------------------------- */

      const uploadUrl =
        await generateUploadUrl();

      if (!uploadUrl) {
        throw new Error(
          "Unable to generate upload URL."
        );
      }

      /* -------------------------------------------------------------------- */
      /* Step 2: Upload image to Convex Storage                               */
      /* -------------------------------------------------------------------- */

      const uploadResponse =
        await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

      if (!uploadResponse.ok) {
        throw new Error(
          `Image upload failed: ${uploadResponse.status}`
        );
      }

      /* -------------------------------------------------------------------- */
      /* Step 3: Get Convex storage ID                                        */
      /* -------------------------------------------------------------------- */

      const uploadResult =
        await uploadResponse.json();

      if (!uploadResult?.storageId) {
        throw new Error(
          "Convex did not return a storage ID."
        );
      }

      /*
       * Save the storage ID.
       *
       * The useQuery above will now retrieve
       * the permanent URL.
       */
      setStorageId(
        uploadResult.storageId
      );
    } catch (error) {
      console.error(
        "Error uploading event image:",
        error
      );

      setUploading(false);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }

      setStorageId(null);

      setErrorMessage(
        "Unable to upload the image. Please try again."
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Select Unsplash Image                                                    */
  /* ------------------------------------------------------------------------ */

  const handleSelectUnsplashImage = (
    url
  ) => {
    if (!url) {
      return;
    }

    setErrorMessage("");

    /*
     * Unsplash already gives us a permanent
     * external image URL.
     */
    onSelect(url);

    onClose();
  };

  /* ------------------------------------------------------------------------ */
  /* Clear Preview                                                            */
  /* ------------------------------------------------------------------------ */

  const handleClearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");

    setUploading(false);

    setStorageId(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !uploading) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}

        <DialogHeader>
          <DialogTitle>
            Choose Event Image
          </DialogTitle>
        </DialogHeader>

        {/* ---------------------------------------------------------------- */}
        {/* Gallery Upload                                                    */}
        {/* ---------------------------------------------------------------- */}

        <div className="rounded-xl border p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-purple-500" />
              </div>

              <div>
                <p className="font-medium">
                  Add your own photo
                </p>

                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP or other image
                  formats up to 10 MB
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleOpenGallery}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload from Gallery
                </>
              )}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Gallery Preview                                                 */}
          {/* -------------------------------------------------------------- */}

          {previewUrl && (
            <div className="relative mt-4 overflow-hidden rounded-lg border aspect-video">
              <Image
                src={previewUrl}
                alt="Selected event image preview"
                fill
                unoptimized
                className="object-cover"
              />

              {!uploading && (
                <button
                  type="button"
                  onClick={handleClearPreview}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                  aria-label="Remove selected image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />

                  <p className="text-sm font-medium">
                    Uploading image...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Divider                                                           */}
        {/* ---------------------------------------------------------------- */}

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />

          <span className="text-xs text-muted-foreground">
            OR CHOOSE FROM UNSPLASH
          </span>

          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Unsplash Search                                                   */}
        {/* ---------------------------------------------------------------- */}

        <form
          onSubmit={handleSearch}
          className="flex gap-2"
        >
          <Input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search for event images..."
            className="flex-1"
            disabled={uploading}
          />

          <Button
            type="submit"
            disabled={
              loading || uploading
            }
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}

            <span className="hidden sm:inline">
              Search
            </span>
          </Button>
        </form>

        {/* ---------------------------------------------------------------- */}
        {/* Error                                                             */}
        {/* ---------------------------------------------------------------- */}

        {errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-500">
              {errorMessage}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Unsplash Images                                                   */}
        {/* ---------------------------------------------------------------- */}

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
              {images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  disabled={uploading}
                  onClick={() =>
                    handleSelectUnsplashImage(
                      image.urls.regular
                    )
                  }
                  className="relative aspect-video overflow-hidden rounded-lg border-2 border-transparent hover:border-purple-500 transition-all focus:outline-none focus:border-purple-500 disabled:opacity-50"
                >
                  <Image
                    src={image.urls.small}
                    alt={
                      image.alt_description ||
                      image.description ||
                      "Unsplash event image"
                    }
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />

              <p className="text-sm">
                Search for images or upload your
                own event photo.
              </p>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                            */}
        {/* ---------------------------------------------------------------- */}

        <p className="text-xs text-muted-foreground">
          Photos shown from{" "}
          <a
            href="https://unsplash.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Unsplash
          </a>
          . You can also upload an image from your
          device.
        </p>
      </DialogContent>
    </Dialog>
  );
}