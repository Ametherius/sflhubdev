"use server";

const apiURL = "https://api.samsara.com/";
const apiKey = process.env.SAMSARA_API_KEY;
export const getData = async function (endpoint) {
  try {
    const response = await fetch(`${apiURL}${endpoint}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) throw new Error(`HTTP Error! Status ${response.status}`);

    const result = await response.json();
    console.log("Samsara Data:", result);
    return result;
  } catch (error) {
    console.error("Failed to retrieve data:", error.message);
    return null;
  }
};

export async function postData(endpoint, payload) {
  try {
    const res = await fetch(`${apiURL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("POST error");

    const result = await res.json();
    return result;
  } catch (err) {
    console.error("Failed to send message");
    throw err;
  }
}
