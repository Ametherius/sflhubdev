export const getData = async function () {
  const apiURL = "https://api.samsara.com/";
  const apiKey = process.env.SAMSARA_API_KEY;
  try {
    const response = await fetch(`${apiURL}fleet/vehicles`, {
      method: "GET",
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

export const getStats = async function () {};
