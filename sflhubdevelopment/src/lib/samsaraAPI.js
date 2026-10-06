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
    // console.log("Samsara Data:", result);
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`POST ${res.status}: ${detail}`);
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to send route:", err);
    throw err;
  }
}

export async function patchData(endpoint, payload) {
  try {
    const res = await fetch(`${apiURL}${endpoint}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`PATCH ${res.status}: ${detail}`);
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to update route:", err);
    throw err;
  }
}
