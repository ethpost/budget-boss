import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

type PlaidEnvironment = "sandbox" | "development" | "production";

function getPlaidEnvironment(value: string | undefined): PlaidEnvironment {
  switch (value) {
    case "production":
      return "production";
    case "development":
      return "development";
    default:
      return "sandbox";
  }
}

export function createPlaidClient(params: {
  clientId: string;
  secret: string;
  environment?: string;
}): PlaidApi {
  const configuration = new Configuration({
    basePath: PlaidEnvironments[getPlaidEnvironment(params.environment)],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": params.clientId,
        "PLAID-SECRET": params.secret,
      },
    },
  });

  return new PlaidApi(configuration);
}
