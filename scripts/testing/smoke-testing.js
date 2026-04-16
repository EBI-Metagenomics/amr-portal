import http from 'k6/http';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { check } from 'k6';
import { group } from 'k6';

export const options = {
  vus: 1,
};

let hostName = 'http://amr.review.ensembl.org/amr';

async function checkAMRAPI(hostName) {
  let host = '';
  let apiPath = '';

  host = hostName;
  apiPath = 'api';

  const filtersConfigEndpoint = `${host}/${apiPath}/filters-config`;
  group (`/filters_config`, function () {
    let filtersConfigEndpointResponse = http.get(filtersConfigEndpoint);
//    console.log(filtersConfigEndpointResponse.json().filterCategories);
    let filterCategories = filtersConfigEndpointResponse.json().filterCategories;
    let filterCategoriesCount = Object.keys(filterCategories).length;

    try{
      check(filtersConfigEndpointResponse, {
        [`is status 200`] : (r) => r.status === 200
      },
      );
    }
    finally{
      filtersConfigEndpointResponse = null;
    }
  });

  const amrRecordsEndpoint = `${host}/${apiPath}/amr-records`;
  group (`/amr_records`, function () {
  let params = {
      headers: {
        Connection: "keep-alive",
        "content-type": "application/json",
        Accept: "*/*",
      },
      cookies: {},
    };

   let resp = http.request(
      "POST",
      amrRecordsEndpoint,
      JSON.stringify({
        "selected_filters": [
          { "category": "phenotype-antibiotic_name", "value": "amikacin"}
        ],
        "view_id": 1,
      }),
      params,
    );

    check(resp, { ["AMR records : status equals 200"]: (r) => r.status === 200});

    resp = http.request(
      "POST",
      amrRecordsEndpoint,
      JSON.stringify({
        "selected_filters": [
          {"category":"genotype-species","value":"Acinetobacter baumannii"}
        ],
        "view_id": 2
      }),
      params,
    );

    check(resp, { ["AMR genotype data : status equals 200"]: (r) => r.status === 200,
                });

    resp = http.request(
      "POST",
      amrRecordsEndpoint,
      JSON.stringify({
        "selected_filters": [
            { "category": "phenotype-antibiotic_name", "value": "amikacin"}
        ],
        "view_id": 1,
      }),
      params,
    );

    check(resp, { ["AMR download : status equals 200"]: (r) => r.status === 200,
                });
  });
}

// This function generates an HTML report after the test completes
export function handleSummary(data) {
  return {
    'amr-smoke-test-summary.html': htmlReport(data),
    'amr-smoke-test-summary.json': JSON.stringify(data)
  };
}

export default async function () {
  if(__ENV.HOSTNAME != undefined){
    hostName = `${__ENV.HOSTNAME}`
  };
  await checkAMRAPI(hostName);
}