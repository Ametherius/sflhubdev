const apiUrl = "https://api.gomotive.com/";
const apiKey = process.env.MOTIVE_API_KEY;

export const getMotiveData = async function (
  endpoint,
  extraParams = {},
  { maxPages = 10 } = {},
) {
  const key = apiKey;

  // URL Endpoint Query
  const targetUrl = new URL(`${apiUrl}${endpoint}`);

  // Set params for API query
  targetUrl.searchParams.set("per_page", "100");
  for (const [param, value] of Object.entries(extraParams)) {
    if (value == null || String(value).trim() === "") continue;
    targetUrl.searchParams.set(param, String(value));
  }

  let allData = [];
  let pageNo = 1;
  let HasMorePages = true;
  let loopCounter = 0;

  try {
    while (HasMorePages) {
      loopCounter++;
      if (loopCounter >= maxPages) {
        console.warn(`Forced to stop! Hit max pages of ${maxPages}`);
        break;
      }
      targetUrl.searchParams.set("page_no", pageNo.toString());

      const response = await fetch(targetUrl.href, {
        method: "GET",
        headers: {
          "X-API-Key": key,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error Status: ${response.status}`);
      }

      const result = await response.json();

      const dataKey = Object.keys(result).find((keyName) =>
        Array.isArray(result[keyName]),
      );
      const pageRecords = dataKey ? result[dataKey] : [];

      allData = allData.concat(pageRecords);
      const totalCount = result.pagination?.total || 0;

      if (allData.length >= totalCount || pageRecords.length === 0) {
        HasMorePages = false;
      } else {
        pageNo++;
      }
    }
    return allData;
  } catch (err) {
    console.error("Failed to retrieve data: ", err.message);
    return null;
  }
};

