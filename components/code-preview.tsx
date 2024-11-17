import { memo, useState, useEffect } from "react";
import {
  Binary,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodePreviewProps {
  language: string;
  content: string;
  theme: string;
}

type DeviceFrame = "desktop" | "tablet" | "mobile";
type ViewMode = DeviceFrame | "fullscreen";

const deviceSizes = {
  desktop: { width: "100%", height: "100%", maxWidth: "1400px" },
  tablet: { width: "100%", height: "100%", maxWidth: "820px" },
  mobile: { width: "100%", height: "100%", maxWidth: "390px" },
};

function CodePreviewComponent({ language, content, theme }: CodePreviewProps) {
  const [currentDevice, setCurrentDevice] = useState<DeviceFrame>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  const PreviewFrame = () => (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className={cn(
          "relative transition-all duration-300 bg-background/95 backdrop-blur-sm",
          currentDevice !== "desktop" &&
            "rounded-lg shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)] border border-border/30",
          currentDevice === "mobile" && "mx-auto rounded-[2.5rem]",
          currentDevice === "tablet" && "mx-auto rounded-[1.5rem]"
        )}
        style={{
          width: deviceSizes[currentDevice].width,
          maxWidth: deviceSizes[currentDevice].maxWidth,
          height: "100%",
        }}
      >
        {/* Device Frame Elements - Diperhalus */}
        {currentDevice === "mobile" && (
          <>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-[4px] bg-border/40 rounded-full backdrop-blur-sm" />
            <div className="absolute -left-[1px] -right-[1px] top-0 h-[2rem] rounded-t-[2.5rem] border-t border-x border-border/30 bg-gradient-to-b from-border/5" />
            <div className="absolute -left-[1px] -right-[1px] bottom-0 h-[2rem] rounded-b-[2.5rem] border-b border-x border-border/30 bg-gradient-to-t from-border/5" />
          </>
        )}
        {currentDevice === "tablet" && (
          <>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-border/40 rounded-full backdrop-blur-sm" />
            <div className="absolute -left-[1px] -right-[1px] top-0 h-[1.5rem] rounded-t-[1.5rem] border-t border-x border-border/30 bg-gradient-to-b from-border/5" />
            <div className="absolute -left-[1px] -right-[1px] bottom-0 h-[1.5rem] rounded-b-[1.5rem] border-b border-x border-border/30 bg-gradient-to-t from-border/5" />
          </>
        )}

        {/* Device Label - Diperindah */}
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-background/95 rounded-full text-xs font-medium border border-border/30 shadow-sm backdrop-blur-sm">
          {currentDevice === "desktop" && (
            <span className="flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              Desktop View
            </span>
          )}
          {currentDevice === "tablet" && (
            <span className="flex items-center gap-1.5">
              <Tablet className="h-3.5 w-3.5" />
              Tablet View (820px)
            </span>
          )}
          {currentDevice === "mobile" && (
            <span className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              Mobile View (390px)
            </span>
          )}
        </div>

        <iframe
          srcDoc={`
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  html, body { 
                    height: 100%;
                    margin: 0;
                    overflow: auto;
                  }
                  body { 
                    font-family: system-ui, -apple-system, sans-serif;
                    background: ${theme === "dark" ? "#111" : "#fff"};
                    color: ${theme === "dark" ? "#fff" : "#111"};
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                  }
                  .content-wrapper {
                    flex: 1;
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                    padding: 1.75rem;
                    overflow-y: auto;
                  }
                  ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                  }
                  ::-webkit-scrollbar-track {
                    background: ${theme === "dark" ? "#1a1a1a" : "#f1f1f1"};
                    border-radius: 4px;
                  }
                  ::-webkit-scrollbar-thumb {
                    background: ${theme === "dark" ? "#333" : "#ddd"};
                    border-radius: 4px;
                  }
                  ::-webkit-scrollbar-thumb:hover {
                    background: ${theme === "dark" ? "#444" : "#ccc"};
                  }
                  ${language === "css" ? content : ""}
                </style>
              </head>
              <body>
                <div class="content-wrapper">
                  ${language === "html" ? content : ""}
                </div>
              </body>
            </html>
          `}
          className={cn(
            "bg-background w-full h-full transition-all duration-300",
            currentDevice === "mobile" && "rounded-[2.25rem]",
            currentDevice === "tablet" && "rounded-[1.25rem]",
            currentDevice === "desktop" && "rounded-lg"
          )}
          style={{
            width: "100%",
            height: "100%",
          }}
          title="Preview"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );

  if (language !== "html" && language !== "css") {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground gap-3">
        <Binary className="h-12 w-12 text-primary/20" />
        <p className="text-sm">Preview not available for {language} code</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-full"
      )}
    >
      {/* Device Selection Toolbar */}
      <div
        className={cn(
          "flex items-center justify-between p-4 border-b border-border/50",
          isFullscreen
            ? "bg-background"
            : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            variant={currentDevice === "desktop" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCurrentDevice("desktop")}
            className="gap-2"
            disabled={isFullscreen}
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Desktop</span>
          </Button>
          <Button
            variant={currentDevice === "tablet" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCurrentDevice("tablet")}
            className="gap-2"
            disabled={isFullscreen}
          >
            <Tablet className="h-4 w-4" />
            <span className="hidden sm:inline">Tablet</span>
          </Button>
          <Button
            variant={currentDevice === "mobile" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCurrentDevice("mobile")}
            className="gap-2"
            disabled={isFullscreen}
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Mobile</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isFullscreen ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleFullscreen}
            className="gap-2"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </Button>
          {isFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Container - Dioptimalkan */}
      <div
        className={cn(
          "flex-1 relative overflow-auto",
          isFullscreen ? "p-0" : "p-4 md:p-8",
          !isFullscreen &&
            "bg-gradient-to-b from-muted/40 via-muted/25 to-transparent"
        )}
      >
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            isFullscreen ? "h-[calc(100vh-64px)]" : "h-[calc(100vh-150px)]",
            "transition-all duration-300 ease-in-out"
          )}
        >
          <PreviewFrame />
        </div>
      </div>

      {/* ESC Hint */}
      {isFullscreen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-background/90 rounded-full border border-border/50 shadow-lg backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-muted rounded text-xs">ESC</kbd>{" "}
            to exit fullscreen
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(CodePreviewComponent);
