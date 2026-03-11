/**
 * エリア別 OTA 検索ベースURL プリセット
 *
 * 各OTAの検索結果ページURLテンプレート。
 * 日付・人数などの動的パラメータはジョブ実行時に上書きされる。
 */

export interface AreaPreset {
  label: string;
  urls: Record<string, string>;
}

export const AREA_PRESETS: Record<string, AreaPreset> = {
  naha: {
    label: "那覇",
    urls: {
      rakuten:
        "https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_dai=japan&f_chu=okinawa&f_shou=nahashi",
      jalan: "https://www.jalan.net/470000/LRG_470200/",
      ikyu: "https://www.ikyu.com/area/ma047007/",
      expedia:
        "https://www.expedia.co.jp/Hotel-Search?destination=%E9%82%A3%E8%A6%87&sort=RECOMMENDED",
      booking:
        "https://www.booking.com/searchresults.ja.html?ss=%E9%82%A3%E8%A6%87&dest_type=city&group_adults=2&no_rooms=1&group_children=0&order=popularity",
      agoda:
        "https://www.agoda.com/ja-jp/search?area=564855&locale=ja-jp&textToSearch=%E9%82%A3%E8%A6%87%2C+%E6%B2%96%E7%B8%84%E6%9C%AC%E5%B3%B6&priceCur=JPY&productType=-1&travellerType=1",
      tripcom:
        "https://jp.trip.com/hotels/list?cityId=92573&provinceId=11059&countryId=78&cityName=%E9%82%A3%E8%A6%87%E5%B8%82&destName=%E9%82%A3%E8%A6%87%E5%B8%82%2C%20%E6%B2%96%E7%B8%84%E7%9C%8C%2C%20%E6%97%A5%E6%9C%AC&searchWord=%E9%82%A3%E8%A6%87%E5%B8%82&searchType=CT&optionId=92573&curr=JPY&locale=ja-JP",
      yahoo: "https://travel.yahoo.co.jp/area/ma047007/",
    },
  },
  chatan: {
    label: "北谷",
    urls: {
      rakuten:
        "https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_dai=japan&f_chu=okinawa&f_shou=chubu",
      jalan: "https://www.jalan.net/470000/LRG_470500/",
      ikyu: "https://www.ikyu.com/okinawa/36201004/",
      expedia:
        "https://www.expedia.co.jp/Hotel-Search?destination=%E5%8C%97%E8%B0%B7%E7%94%BA%2C%20%E6%B2%96%E7%B8%84%E7%9C%8C%2C%20%E6%97%A5%E6%9C%AC&regionId=6141564&sort=RECOMMENDED",
      booking:
        "https://www.booking.com/searchresults.ja.html?ss=%E5%8C%97%E8%B0%B7%E7%94%BA&dest_id=-226424&dest_type=city&order=popularity",
      agoda:
        "https://www.agoda.com/ja-jp/search?area=564843&locale=ja-jp&textToSearch=%E5%8C%97%E8%B0%B7&priceCur=JPY&productType=-1&travellerType=1",
      tripcom:
        "https://jp.trip.com/hotels/list?city=62278&cityName=%E5%8C%97%E8%B0%B7%E7%94%BA&provinceId=11059&countryId=78&searchType=CT&searchWord=%E5%8C%97%E8%B0%B7%E7%94%BA&domestic=false",
      yahoo: "https://travel.yahoo.co.jp/okinawa/36201004/",
    },
  },
};

export const AREA_LIST = Object.keys(AREA_PRESETS);
