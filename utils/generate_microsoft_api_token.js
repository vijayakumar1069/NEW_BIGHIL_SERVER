import dotenv from "dotenv";
dotenv.config();
export const generateMicrosoftAccess_Token = async () => {
  try {
    // Define the request body with the required grant_type parameter
    const requestBody = new URLSearchParams();
    requestBody.append("grant_type", "client_credentials");
    requestBody.append("client_id", process.env.CLIENT_ID);
    requestBody.append("client_secret", process.env.CLIENT_SECRET_KEY);
    requestBody.append("scope", "https://graph.microsoft.com/.default");

    // Make the POST request to the token endpoint using fetch
    const response = await fetch(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: requestBody, // Use requestBody directly in the fetch request
      }
    );

    // Check if the response is OK
    if (!response.ok) {
      throw new Error(`Error fetching access token: ${response.statusText}`);
    }

    // Parse the JSON response
    const tokenResponse = await response.json();

    // Send the token response back to the client
    return {
      token: tokenResponse.access_token,
    };
  } catch (error) {
    // Handle errors
    console.error("Error getting access token:", error.message); // Log the error message
    return {
      error: error.message,
    };
  }
};
