import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-foreground text-tracking-tight">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFound.message")}</p>
        <a href="/" className="text-primary hover:underline">
          {t("notFound.goHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
