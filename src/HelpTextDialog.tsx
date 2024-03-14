import React, { Suspense, useEffect, useRef } from "react";
import { Box, Dialog } from "@mui/material";
import { useTranslation } from "react-i18next";

const Markdown = React.lazy(() => import("react-markdown"));

function useHelpText({ open, url }: { open: boolean; url: string }) {
  const [helpText, setHelpText] = React.useState<string | null>(null);
  const prevUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!open || prevUrl.current === url) return;
    setHelpText(null);
    fetch(`${new URL(url)}manifest.json`).then(async (res) => {
      if (res.ok) {
        const manifest = await res.json();
        prevUrl.current = url;
        setHelpText(manifest.description || "");
      }
    });
  }, [url, open]);

  return helpText;
}

function HelpTextDialog({
  open,
  onClose,
  url,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
}) {
  const helpText = useHelpText({ open, url });
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box sx={{ padding: 2 }}>
        {helpText === null ? (
          t("Loading...")
        ) : helpText ? (
          <Suspense fallback={helpText}>
            <Markdown>{helpText}</Markdown>
          </Suspense>
        ) : (
          t("No help available")
        )}
      </Box>
    </Dialog>
  );
}

export default HelpTextDialog;
