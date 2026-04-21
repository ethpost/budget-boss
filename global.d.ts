declare module "*.css";

type PlaidLinkCreateConfig = {
  token: string;
  onSuccess: (publicToken: string) => void;
  onExit?: () => void;
};

type PlaidLinkHandler = {
  open: () => void;
  destroy?: () => void;
};

interface Window {
  Plaid?: {
    create: (config: PlaidLinkCreateConfig) => PlaidLinkHandler;
  };
}
