# **URLパラメータ分析**

## □楽天トラベル

以下は、提示URL（`/ds/vacant/searchVacant`）のクエリパラメータを **要件定義書の素材としてそのまま使える粒度** に整理したものです。

※楽天トラベルの「公開API仕様書」ではなく、画面URLから読み取れる **実運用上のパラメータ仕様（観測ベース）** です。仕様変更される可能性がある前提で扱うのが安全です。 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0))

---

## 1. 対象URL（エンドポイント）

- **URL**: `https://search.travel.rakuten.co.jp/ds/vacant/searchVacant`
- **用途**: 国内宿泊（ホテル・旅館）の空室検索結果ページ（指定日程・人数・エリア等の条件で一覧表示）

---

## 2. このURLが表している検索条件（人間が読める要約）

提示URLは以下の条件に相当します：

- **エリア**：沖縄県 / 那覇（`f_chu=okinawa`, `f_shou=nahashi`）
- **日程**：チェックイン **2026/04/01**、チェックアウト **2026/04/02**（`f_nen1/f_tuki1/f_hi1`, `f_nen2/f_tuki2/f_hi2`）
    
    ※`f_hi1`がチェックイン日、`f_hi2`がチェックアウト日である点は、同URL体系の解析例で明示されています。 ([mtioutput.com](https://www.mtioutput.com/entry/rakuten-travel-curl))
    
- **人数/部屋**：1部屋・大人2名・子供0名（`f_heya_su=1`, `f_otona_su=2`, 子供系は全部0）
- **料金条件**：下限0、上限なし（`f_kin2=0`, `f_kin=`）
- **並び順/表示**：ホテルタブ、並び順=hotel、1ページ目、30件表示、画像表示（`f_tab=hotel`, `f_sort=hotel`, `f_page=1`, `f_hyoji=30`, `f_image=1`）

---

## 3. パラメータ仕様（辞書：要件定義書に貼れる形）

### 3.1 必須（最低限、検索結果を成立させるために必要になりやすい）

| パラメータ | 意味 | 型/例 | 必須 | バリデーション/備考 |
| --- | --- | --- | --- | --- |
| `f_cd` | サービス区分（このエンドポイントでは国内宿泊検索で `03` が一般的） | `03` | ◯ | `/ds/vacant/searchVacant` の多数例で `03` が使われる ([mtioutput.com](https://www.mtioutput.com/entry/rakuten-travel-curl)) |
| `f_dai` | 大区分（国内は `japan`） | `japan` | ◯ | 海外系では `kaigai` が使われる例あり ([osearch.travel.rakuten.co.jp](https://osearch.travel.rakuten.co.jp/os/outboundHotelAreaSearch.do?f_area=150&f_cd=02&f_chu=Vietnam&f_dai=kaigai&f_heya_su=1&f_kin=&f_kin2=0&f_otona_su=1&f_page=1&f_s1=0&f_sort=hotel_kin_high&f_tab=hotel&f_y4=0&utm_source=chatgpt.com)) |
| `f_chu` | 中区分（都道府県ローマ字コード） | `okinawa` | ◯ | “全国 > 沖縄県 > 那覇” のパンくずと整合 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_shou` | 小区分（エリア/市区相当のローマ字コード） | `nahashi` | ◯ | 同上 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_nen1`,`f_tuki1`,`f_hi1` | チェックイン（年/月/日） | `2026,4,1` | ◯ | `f_hi1`=チェックイン日 ([mtioutput.com](https://www.mtioutput.com/entry/rakuten-travel-curl)) |
| `f_nen2`,`f_tuki2`,`f_hi2` | チェックアウト（年/月/日） | `2026,4,2` | ◯ | `f_hi2`=チェックアウト日 ([mtioutput.com](https://www.mtioutput.com/entry/rakuten-travel-curl)) |
| `f_heya_su` | 部屋数 | `1` | ◯ | UI上も「部屋数」指定が存在 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_otona_su` | 大人人数（1部屋あたり） | `2` | ◯ | UI上も「大人」指定が存在 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |

---

### 3.2 人数（子供内訳：6カテゴリ）

検索フォームにある子供内訳（表示されている6分類）と、URLの6変数が一致します。 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0))

（ここは **推定** ですが、UIの並びとパラメータ数が一致するため妥当性が高いです）

| パラメータ | 意味（推定） | 型/例 | 備考 |
| --- | --- | --- | --- |
| `f_s1` | 小学生 高学年 | `0..` | UIに「小学生 高学年」 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_s2` | 小学生 低学年 | `0..` | UIに「小学生 低学年」 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_y1` | 幼児 食事・布団付 | `0..` | UIに該当項目 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_y2` | 幼児 食事のみ | `0..` | 同上 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_y3` | 幼児 布団のみ | `0..` | 同上 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_y4` | 幼児 食事・布団不要 | `0..` | 同上 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |

**要件（バリデーション案）**

- すべて **非負整数**
- `f_otona_su + f_s1 + f_s2 + f_y1 + f_y2 + f_y3 + f_y4 >= 1`
- UI上は「1部屋あたり人数」「部屋数」の概念があるため、**部屋ごとの割当（将来要件）** を別モデルとして設計しておくと拡張に強い ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0))

---

### 3.3 料金条件（下限・上限）

| パラメータ | 意味 | 型/例 | 備考 |
| --- | --- | --- | --- |
| `f_kin2` | 合計料金の下限（推定） | `0` | UIに料金レンジが存在 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_kin` | 合計料金の上限（推定） | 空 or `40000` | URL例で上限として使われるケースが多い（観測） ([Review33](https://m.review33.com/forum_msg.php?db=8&number=56&s=&sort=1&topic=86180502165058&tstart=350&utm_source=chatgpt.com)) |

※`f_kin2=0` かつ `f_kin=`（空）で “実質フィルタなし” になる挙動は観測上自然ですが、公式仕様がないため **推定** 扱いにしています（UIの価格レンジの存在と、他URL例の使われ方から推論）。 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0))

---

### 3.4 並び順・ページング・表示

| パラメータ | 意味 | 例 | 備考 |
| --- | --- | --- | --- |
| `f_tab` | 表示タブ | `hotel` | ホテル一覧タブ ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_sort` | 並び順 | `hotel` / `hotel_kin_low` / `hotel_kin_high` / `eval` など | 価格昇順/降順や評価順がURL例で確認できる ([楽天トラベル](https://web.travel.rakuten.co.jp/portal/my/search_undecided.main?f_cd=03&f_chu=yamanasi&f_city=1943000&f_dai=japan&f_hyoji=30&f_page_style=&f_sai=&f_shou=kawaguchiko&f_sort=hotel_kin_high&f_teikei=&utm_source=chatgpt.com)) |
| `f_page` | ページ番号 | `1` | 1始まり |
| `f_hyoji` | 1ページ表示件数 | `30` | 例で30が多い ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |
| `f_image` | 画像表示 | `1` | 0/1（推定：フラグ名から） |

---

### 3.5 位置情報・ランドマーク（今回URLでは未使用）

| パラメータ | 意味（推定） | 例 | 理由（推定根拠） |
| --- | --- | --- | --- |
| `f_landmark_id` | ランドマークID | 空 / 数値 | 名称が “landmark_id” のため |
| `f_geo` | 地図/近傍検索のモード | `0` | geo検索フラグっぽい（`lat/long`群と併存） |
| `f_ido`,`f_kdo` | 緯度/経度（中心点など） | `0` | 「ido=緯度」「kdo=経度」と読め、他URLでも併存 ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/hotellist/Japan-Yamanashi-Fujikawaguchiko-Kawaguchiko-review?f_chu_ann=yamanasi&f_da_city=Fujikawaguchiko&f_dai=japan&f_datumType=WGS&f_heya_su=1&f_hyoji=5&f_ido=0.0&f_image=1&f_kdo=0.0&f_km=5.0&f_latitude=35.5111&f_longitude=138.7621315&f_otona_su=1&f_page=73&f_point_max=10&f_point_min=0&f_s1=0&f_s2=0&f_shou_ann=kawaguchiko&f_sort=hotel&f_sort_cate=hotel&f_spot=Kawaguchiko&f_tab=hotel&f_teikei=kn01&f_y1=0&f_y2=0&f_y3=0&f_y4=0&utm_source=chatgpt.com)) |
| `f_latitude`,`f_longitude` | 緯度/経度（検索点など） | `0` | 他URLで具体値が入る例あり ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/hotellist/Japan-Yamanashi-Fujikawaguchiko-Kawaguchiko-review?f_chu_ann=yamanasi&f_da_city=Fujikawaguchiko&f_dai=japan&f_datumType=WGS&f_heya_su=1&f_hyoji=5&f_ido=0.0&f_image=1&f_kdo=0.0&f_km=5.0&f_latitude=35.5111&f_longitude=138.7621315&f_otona_su=1&f_page=73&f_point_max=10&f_point_min=0&f_s1=0&f_s2=0&f_shou_ann=kawaguchiko&f_sort=hotel&f_sort_cate=hotel&f_spot=Kawaguchiko&f_tab=hotel&f_teikei=kn01&f_y1=0&f_y2=0&f_y3=0&f_y4=0&utm_source=chatgpt.com)) |
| `f_datumType` | 測地系 | 空 / `WGS` | `WGS` 指定の例がある ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/hotellist/Japan-Yamanashi-Fujikawaguchiko-Kawaguchiko-review?f_chu_ann=yamanasi&f_da_city=Fujikawaguchiko&f_dai=japan&f_datumType=WGS&f_heya_su=1&f_hyoji=5&f_ido=0.0&f_image=1&f_kdo=0.0&f_km=5.0&f_latitude=35.5111&f_longitude=138.7621315&f_otona_su=1&f_page=73&f_point_max=10&f_point_min=0&f_s1=0&f_s2=0&f_shou_ann=kawaguchiko&f_sort=hotel&f_sort_cate=hotel&f_spot=Kawaguchiko&f_tab=hotel&f_teikei=kn01&f_y1=0&f_y2=0&f_y3=0&f_y4=0&utm_source=chatgpt.com)) |
| `f_dist` | 距離条件（推定） | 空 | “dist” の名前から。実値例が少なく推定止まり |
| `f_cok` | 温泉地コード等の特集コード（推定） | `OK00018` 等 | 温泉一覧系URLで `f_cok=OK...` が使われる ([楽天トラベル](https://web.travel.rakuten.co.jp/portal/my/onsen_list.main?f_cd=02&f_chu=hokkaido&f_chujyo=hokkaido&f_cok=OK00018&f_dai=japan&f_sai=&f_shou=hakodate&f_teikei=ONSEN&utm_source=chatgpt.com)) |

---

### 3.6 その他フィルタ（今回URLでは空）

| パラメータ | 意味（推定） | 例 | 備考 |
| --- | --- | --- | --- |
| `f_teikei` | 提携/特集/流入元など | `quick`, `premium`, `ONSEN` など | 複数ページで利用例あり ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/undated/search?f_cd=03&f_chu=hukuoka&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_page=1&f_point_min=&f_rm_equip=&f_sai=&f_setubi=&f_shou=kurume&f_sort=hotel&f_tab=hotel&f_teikei=quick&utm_source=chatgpt.com)) |
| `f_disp_type` | 表示形式 | 空 | 具体値例が薄く推定止まり |
| `f_rm_equip` | 客室設備フィルタ | 空 | “rm_equip” から推定 |
| `f_setubi` | 館内設備フィルタ | 空 | “setubi（設備）” から推定 |
| `f_point_min` | ポイント条件（下限） | `0` | “point_min” から推定（表示上もポイント表記がある） ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0)) |

---

## 4. 要件定義（このURL仕様を利用する機能要件）

「URLのパラメータを扱う」前提で、要件定義書に落とすならこの構成が使いやすいです。

### 4.1 機能要件（URL生成/解析）

1. **検索条件 → URL生成**
- 入力：エリア（大/中/小/細）、日付、人数（大人/子供内訳）、料金レンジ、表示（並び順/表示件数/ページ）
- 出力：`/ds/vacant/searchVacant` のクエリを生成
- 仕様：空文字は **未指定**、数値の `0` は **明示的デフォルト** として扱う
1. **URL → 検索条件への復元（パース）**
- 入力：楽天トラベルURL
- 出力：内部の `SearchCondition` オブジェクト
- 仕様：未知パラメータは `extra_params` に保持して **破壊的変更を避ける**
1. **正規化（canonicalize）**
- 月日を `04`/`01` のように **ゼロ埋めする/しない** は混在するため、システム内で統一（例：2桁固定）
    
    ※楽天側はどちらも受ける可能性が高いが、これは観測ベースのため「統一は自システム都合」として扱うのが安全（推定）
    

### 4.2 バリデーション要件（最低限）

- 日付：`checkin < checkout`（同日/逆転はエラー）
- 人数：全員合計が0にならない
- 料金：`min <= max`（max未指定を許容）
- 表示：`f_hyoji` は許容値（例：5/10/20/30…）に制限（UIから逆算して固定候補を持つ） ([楽天トラベル](https://search.travel.rakuten.co.jp/ds/vacant/searchVacant?f_cd=03&f_chu=okinawa&f_cok=&f_dai=japan&f_datumType=&f_disp_type=&f_dist=&f_geo=0&f_heya_su=1&f_hi1=1&f_hi2=2&f_hyoji=30&f_ido=0&f_image=1&f_kdo=0&f_kin=&f_kin2=0&f_landmark_id=&f_latitude=0&f_longitude=0&f_nen1=2026&f_nen2=2026&f_otona_su=2&f_page=1&f_point_min=0&f_rm_equip=&f_s1=0&f_s2=0&f_sai=&f_setubi=&f_shou=nahashi&f_sort=hotel&f_tab=hotel&f_teikei=&f_tuki1=4&f_tuki2=4&f_y1=0&f_y2=0&f_y3=0&f_y4=0))

---

## 5. 受入テスト（Given/When/Then 例）

- **Given**: 沖縄県/那覇、2026/04/01-04/02、1部屋、大人2
    
    **When**: URL生成
    
    **Then**: `f_chu=okinawa&f_shou=nahashi&f_nen1=2026&f_tuki1=4&f_hi1=1&f_nen2=2026&f_tuki2=4&f_hi2=2&f_heya_su=1&f_otona_su=2...` を含む
    
- **Given**: URLに子供内訳が指定されている（例：`f_s1=1,f_y4=1`）
    
    **When**: URLパース
    
    **Then**: 子供内訳モデルに正しく復元される（未知キーはextraへ）
    

---

## □じゃらん

※`rootCd`/`distCd`/`reShFlg`/`mvTabFlg`/`listId`/`screenId`あたりは公式仕様が公開されていないため、**観測できるURLパターンからの推定**も含みます（推定箇所は理由も併記します）。

---

## 1. 対象URL（例）

`https://www.jalan.net/470000/LRG_470200/?stayYear=2026&stayMonth=4&stayDay=1&stayCount=1&roomCount=1&adultNum=2&minPrice=0&maxPrice=999999&mealType=&kenCd=470000&lrgCd=470200&rootCd=04&distCd=01&roomCrack=200000&reShFlg=1&mvTabFlg=0&listId=0&screenId=UWW1402`

---

## 2. URL構造（固定部分）

- **ホスト**：`www.jalan.net`
- **パス**：`/{kenCd}/LRG_{lrgCd}/`
    - 例：`/210000/LRG_210200/` のように `kenCd` と `lrgCd` がパスにも入るパターンが確認できるため、**パスとクエリの両方で整合**を取るのが安全です。 ([じゃらん](https://www.jalan.net/210000/LRG_210200/SML_210202/?adultNum=2&dateUndecided=1&distCd=01&kenCd=210000&maxPrice=20000&mealType=3&roomCount=1&roomCrack=200000&rootCd=0153436&screenId=UWW3001&smlCd=210202&stayCount=1&utm_source=chatgpt.com))

---

## 3. クエリパラメータ仕様（要件定義用カタログ）

### 3.1 検索条件パラメータ（ユーザーが操作する前提）

| key | 意味 | 型 | 必須 | 例 | 制約/バリデーション |
| --- | --- | --- | --- | --- | --- |
| `stayYear` | チェックイン年 | int | ◯ | 2026 | 4桁。`stayMonth`,`stayDay`と合わせて実在日付になること |
| `stayMonth` | チェックイン月 | int | ◯ | 4 | 1〜12 |
| `stayDay` | チェックイン日 | int | ◯ | 1 | 月に応じた1〜28/29/30/31 |
| `stayCount` | 泊数 | int | ◯ | 1 | 宿泊検索は通常1以上。日帰り系では0の例あり ([じゃらん](https://www.jalan.net/uw/uwp1400/uww1420.do?activeSort=1&adultNum=2&dateUndecided=1&distCd=05&idx=0&minPrice=7960&mvTabFlg=1&photo=1&planCd=L0025146&roomCount=1&roomCrack=200000&roomTypeCd=0190578&rootCd=0158011&screenId=UWW1422&ssc=58011&stayCount=0&stayDay=&stayMonth=&stayYear=&vosFlg=6&yadNo=346195&utm_source=chatgpt.com)) |
| `roomCount` | 室数 | int | ◯ | 1 | 1以上（UI上は上限がある想定） |
| `adultNum` | 大人人数 | int | ◯ | 2 | 1以上（UI上は「9〜」表記があるため上限は画面依存） ([じゃらん](https://www.jalan.net/ui/uip1400/uiw1402.do?afCd=JA&crcyCd=CNY&ddd=top_quick&distCd=01&kenCd=380000&langCd=en_US&lrgCd=380500&maxPriceUsd=4000&minPriceUsd=0&roomCount=1&roomCrack=200000&smlCd=380505&stayCount=1&stayDay=13&stayMonth=Mar&stayYear=2026&yadRk=1)) |
| `minPrice` | 最低料金（円） | int | △ | 0 | `0 <= minPrice <= maxPrice` |
| `maxPrice` | 最高料金（円） | int | △ | 999999 | `minPrice <= maxPrice` |
| `mealType` | 食事条件 | string/int | △ | `""` | 空＝指定なし。`1=朝のみ`、`2=夕のみ`、`3=朝・夕` が確認できる ([じゃらん](https://www.jalan.net/uw/uwp1400/uww1400.do?distCd=05&mealType=1&searchModeTab=1&ssc=58565&utm_source=chatgpt.com)) |

### 3.2 エリア指定パラメータ（固定 or 別マスタから選択）

| key | 意味 | 型 | 必須 | 例 | 制約/バリデーション |
| --- | --- | --- | --- | --- | --- |
| `kenCd` | 都道府県コード（推定：県単位） | string/int | ◯ | 470000 | パス先頭の`/470000/`と一致させる |
| `lrgCd` | 大エリアコード（推定：広域） | string/int | ◯ | 470200 | パスの`LRG_470200`と一致させる |

---

## 4. 内部/画面制御系パラメータ（原則は維持、意味は推定）

| key | 役割（推定） | 型 | 推奨扱い | 例 | 推定理由 |
| --- | --- | --- | --- | --- | --- |
| `rootCd` | 流入元/検索の入口種別 | string | **維持推奨** | 04 | 地図検索では`rootCd=56`が使われており、機能ごとに値が変わるため「入口コード」系と推定 ([じゃらん](https://www.jalan.net/uw/uwp1500/uww1501.do?activeSort=0&adultNum=2&dateUndecided=1&distCd=01&lrgCd=220800&roomCount=1&rootCd=56&screenId=UWW1402&stayCount=1&stayDay=&stayMonth=&stayYear=&utm_source=chatgpt.com)) |
| `distCd` | 画面カテゴリ/検索種別 | string | **維持推奨** | 01 | 一覧検索で`01`、プラン/日帰り系で`05`の例があり画面カテゴリと推定 ([じゃらん](https://www.jalan.net/210000/LRG_210200/SML_210202/?adultNum=2&dateUndecided=1&distCd=01&kenCd=210000&maxPrice=20000&mealType=3&roomCount=1&roomCrack=200000&rootCd=0153436&screenId=UWW3001&smlCd=210202&stayCount=1&utm_source=chatgpt.com)) |
| `roomCrack` | 人数条件の内部表現 | int | **生成推奨** | 200000 | `adultNum=1→100000`,`4→400000`,`5→500000`の例があり、`adultNum*100000`で整合するため推定 ([じゃらん](https://www.jalan.net/uw/uwp1400/uww1400.do?adultNum=1&afCd=01&careOnsen=1&childPriceFlg=0%2C0%2C0%2C0%2C0&dateUndecided=1&distCd=03&kenCd=090000&lrgCd=090200&lrgOsnCd=50092&maxPrice=999999&mealType=&minPrice=0&mvTabFlg=0&reShFlg=1&roomCount=1&roomCrack=100000&rootCd=2451&screenId=UWW1402&stayCount=1&stayDay=&stayMonth=&stayYear=&utm_source=chatgpt.com)) |
| `reShFlg` | 再検索フラグ | int | 維持推奨 | 1 | 多数の検索URLで`reShFlg=1`が付与されるため、検索状態維持に関与すると推定 ([じゃらん](https://www.jalan.net/uw/uwp1400/uww1400.do?adultNum=1&afCd=01&careOnsen=1&childPriceFlg=0%2C0%2C0%2C0%2C0&dateUndecided=1&distCd=03&kenCd=090000&lrgCd=090200&lrgOsnCd=50092&maxPrice=999999&mealType=&minPrice=0&mvTabFlg=0&reShFlg=1&roomCount=1&roomCrack=100000&rootCd=2451&screenId=UWW1402&stayCount=1&stayDay=&stayMonth=&stayYear=&utm_source=chatgpt.com)) |
| `mvTabFlg` | タブ状態（例：0/1） | int | 維持推奨 | 0 | `mvTabFlg=0/1`の両例があり、表示タブ/導線状態と推定 ([じゃらん](https://www.jalan.net/uw/uwp1400/uww1400.do?adultNum=1&afCd=01&careOnsen=1&childPriceFlg=0%2C0%2C0%2C0%2C0&dateUndecided=1&distCd=03&kenCd=090000&lrgCd=090200&lrgOsnCd=50092&maxPrice=999999&mealType=&minPrice=0&mvTabFlg=0&reShFlg=1&roomCount=1&roomCrack=100000&rootCd=2451&screenId=UWW1402&stayCount=1&stayDay=&stayMonth=&stayYear=&utm_source=chatgpt.com)) |
| `listId` | 一覧レイアウト/条件ID | int | 互換性重視なら維持 | 0 | 値が0/4/6など揺れる例があり内部IDと推定 ([じゃらん](https://www.jalan.net/uw/uwp1400/uww1400.do?activeSort=1&adultNum=2&dateUndecided=1&distCd=01&idx=0&kenCd=150000&listId=4&lrgCd=150600&minPrice=16000&mvTabFlg=1&photo=1&roomCount=1&roomCrack=200000&rootCd=2802&screenId=UWW1402&stayCount=1&stayDay=&stayMonth=&stayYear=&vosFlg=6&yadPm=1&utm_source=chatgpt.com)) |
| `screenId` | 画面ID | string | **維持推奨** | UWW1402 | 複数画面で共通して付与される例があるため画面識別子と推定 ([Qiita](https://qiita.com/shuasakura0416/questions/7034ef020e5cfc5441cf?utm_source=chatgpt.com)) |

---

## 5. URL生成ルール（実装仕様として明文化）

### 5.1 正規化（Normalize）

1. `stayYear/stayMonth/stayDay` は **必ずセットで扱い**、不正日付はエラー
2. `minPrice/maxPrice` は未指定なら `0/999999` をデフォルト
3. `mealType` 未指定は **空文字**（`mealType=`）で出力（現URLに合わせる）
4. `kenCd/lrgCd` は **パス側とクエリ側を一致**させる
5. `roomCrack` は **`adultNum * 100000`で再計算**して上書き（互換性を優先する場合）
6. 内部系（`rootCd/distCd/reShFlg/mvTabFlg/listId/screenId`）は **基本維持**（将来の画面変更に備え、削除しない）

### 5.2 例：入力モデル（アプリ内部データ）

```json
{
  "area": { "kenCd": "470000", "lrgCd": "470200" },
  "stay": { "date": "2026-04-01", "nights": 1 },
  "rooms": 1,
  "adults": 2,
  "price": { "min": 0, "max": 999999 },
  "mealType": ""
}
```

---

## 6. 機能要件（このURL仕様を使うツール要件に落とす）

### 6.1 必須機能

- **URL解析（Parser）**：じゃらんURLからパラメータを抽出し、内部モデルへ変換
- **URL生成（Builder）**：内部モデルからURLを生成（Normalizeルール適用）
- **バリデーション**：日付不正、`minPrice>maxPrice`、`stayCount<0` などを検出
- **エリア整合**：`/470000/LRG_470200/` と `kenCd/lrgCd` が食い違う場合に警告 or 自動補正
- **互換性維持**：未知パラメータが来ても破棄せず保持（将来の仕様変更に強くする）

### 6.2 受入条件（Given/When/Then 例）

- Given `adults=2`
    
    When URL生成
    
    Then `roomCrack=200000` になる
    
- Given `mealType=1`
    
    When URL生成して開く
    
    Then 一覧に「朝のみ」条件の結果が反映される（少なくともURL上は `mealType=1` を維持） ([じゃらん](https://www.jalan.net/uw/uwp1400/uww1400.do?distCd=05&mealType=1&searchModeTab=1&ssc=58565&utm_source=chatgpt.com))
    
- Given `kenCd/lrgCd` を変更
    
    When URL生成
    
    Then パス `/{kenCd}/LRG_{lrgCd}/` とクエリ `kenCd/lrgCd` が一致する
    

---

必要なら、この仕様をそのまま **「要件定義書テンプレ（目的/スコープ/画面要件/データ定義/受入条件/例外）」** の体裁に整形した版（Word/Notion貼り付け向け）も出します。

## □一休

以下は、いただいた一休のURLを「検索条件をURLで表現する仕様」として再利用できる形に落とし込んだ **要件定義（ドラフト）** です。

※`lc` と `discsort` は画面上で意味が直接確認できないため **推定** を含みます（根拠と検証方法も併記します）。

---

## 1. 対象URL

- 対象：一休「沖縄のおすすめホテル・旅館」一覧ページ
    
    `https://www.ikyu.com/okinawa/360000/` ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))
    
- 例（今回のURL）
    
    `https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1` ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))
    

---

## 2. 画面表示から逆算できる検索条件

このURLを開くと、ページ上部に以下の条件が表示されます。

- 日付：**2026/04/01 〜 2026/04/02** ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))
- 人数・室数：**大人2名 / 子供0名 / 1室** ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))

また、パラメータ無しの同ページでは「日付指定なし 1泊」「大人2名 子供0名 1室」と表示され、人数・室数はデフォルト値として固定で入っている様子が確認できます。 ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/))

---

## 3. URL仕様 要件定義

### 3.1 目的

- 一休のエリア一覧ページに対し、**検索条件（宿泊日・人数・室数・並び順）をURLクエリで表現**し、
    - 条件の保存（ブックマーク/共有）
    - ツール側でのURL生成（レポート、競合調査、クロール導線など）
    - URLから条件を復元（パラメータ解析）
        
        を可能にする。
        

---

## 4. パラメータ定義

### 4.1 パス（Path）定義

| 要素 | 例 | 意味 | 要件 |
| --- | --- | --- | --- |
| `/{area_slug}/{area_id}/` | `/okinawa/360000/` | エリアを表すスラッグ + 数値ID | ツール側は **パスを「検索対象エリアID」として保持**する |

> 備考：このページの見出しが「沖縄のおすすめホテル・旅館」であるため、少なくとも `okinawa/360000` が沖縄エリアを指すことは確認できます。 ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))
> 

---

### 4.2 クエリ（Query）パラメータ定義

| key | 例 | 型 | 推定される意味 | 根拠/補足 |
| --- | --- | --- | --- | --- |
| `cid` | `20260401` | `YYYYMMDD` | チェックイン日 | ページ上部の日付開始が 4/1 になっている ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1)) |
| `cod` | `20260402` | `YYYYMMDD` | チェックアウト日 | ページ上部の日付終了が 4/2 になっている ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1)) |
| `ppc` | `2` | int | 大人の人数（推定：Adult count） | 表示が「大人2名」 ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1)) |
| `rc` | `1` | int | 室数（Room count） | 表示が「1室」 ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1)) |
| `lc` | `1` | int | 泊数（Length count）**推定** | `cid/cod` が1泊で `lc=1` が一致。パラメータ無しページでも「1泊」表示がある ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1)) |
| `discsort` | `1` | int(0/1想定) | 割引/お得順ソート系 **推定** | 変数名が `disc`(discount) + `sort` に見えるため。画面上からは確定できないため要検証 |

### `lc` の推定理由（明示）

- **推定**：`lc` は「泊数」。
- 理由：今回URLは 4/1〜4/2（=1泊）表示で `lc=1` が付与されていること、さらにパラメータ無しでも「1泊」表示があることから、UIが「泊数」を内部的に持っていて `lc` がそれに対応している可能性が高い。 ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))

### `discsort` の推定理由（明示）

- **推定**：`discsort` は「割引率やお得度関連の並び順」スイッチ。
- 理由：命名が `discount sort` を強く示唆。ただしページテキストからは、現在どの並び順が選択されているか・パラメータが効いているかを確定できないため、必ず検証が必要。

---

## 5. バリデーション要件

### 5.1 日付

- `cid`, `cod` は `YYYYMMDD` の8桁数字のみ許可
- `cod` は `cid` より未来であること（同日/過去はエラー）
- 変換後、UI表示と一致すること（後述の受入テストで確認）

### 5.2 人数・室数

- `ppc`（大人）：`>=1` を必須（0は不可）
- `rc`（室数）：`>=1` を必須
- 子供人数は今回URLに含まれないが、ページ表示上は「子供0名」が存在するため、**将来拡張の余地**として「子供数パラメータが別に存在する可能性」を要調査 ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))

### 5.3 ソート

- `discsort` は `0/1` を想定（ただし現時点は **未確定**）
- 不正値の場合は、パラメータを外してデフォルトソートにフォールバック

---

## 6. 正規化仕様（ツール内部データモデル）

URL ⇄ 条件を扱うために、内部では以下に正規化するのを推奨です。

```
SearchCondition
- area_slug: string   (例: "okinawa")
- area_id: string     (例: "360000")
- checkin: date       (例: 2026-04-01)
- checkout: date      (例: 2026-04-02)
- nights: int         (例: 1)  ※cid/cod から算出、または lc を使用（lcは推定）
- adults: int         (例: 2)  ※ppc
- rooms: int          (例: 1)  ※rc
- sort_mode: enum     (例: "discount" / "default" など) ※discsort（未確定）
```

---

## 7. URL生成要件

### 7.1 必須パラメータ（「日付指定あり」検索を再現する場合）

- `cid`, `cod`, `ppc`, `rc`

### 7.2 任意パラメータ

- `lc`：泊数（推定）。`cid/cod` があるなら冗長になり得るため **ツール側で付与するかは方針で決める**
- `discsort`：並び順（未確定）

### 7.3 生成例

- 条件：沖縄 / 2026-04-01 IN / 2026-04-02 OUT / 大人2 / 1室
    
    `.../okinawa/360000/?cid=20260401&cod=20260402&ppc=2&rc=1`
    

---

## 8. 受入テスト要件

### 8.1 表示一致テスト

- Given：URLに `cid=20260401&cod=20260402&ppc=2&rc=1` を含める
- When：ページを開く
- Then：ページ上部が「4月1日〜4月2日」「大人2名 子供0名 1室」と表示されること ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))

### 8.2 デフォルト値テスト

- Given：パラメータ無しで `/okinawa/360000/` を開く
- Then：「日付指定なし 1泊」「大人2名 子供0名 1室」が表示されること ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/))

### 8.3 未確定項目の検証テスト（推奨）

- `discsort` 検証
    - ブラウザで並び順を切り替え → アドレスバーのクエリ差分を確認
    - もしくは DevTools の Network で一覧取得リクエストのクエリを確認
- `lc` 検証
    - 泊数だけ変更できるUI操作がある場合、`lc` が変化するか確認
    - `cid` 固定で泊数変更 → `cod` が自動計算される動きがあるなら `lc` が本命

---

## 9. いまの時点で「未確定」なもの

- `discsort=1` が **どの並び順**を意味するか（お得順/割引順/何かのONフラグ等）
- 子供人数がURLで表現される場合のパラメータ名（表示上は存在するが、今回URLには無い） ([宿泊予約 一休.com](https://www.ikyu.com/okinawa/360000/?cid=20260401&cod=20260402&discsort=1&lc=1&ppc=2&rc=1))

---

もしこの要件定義を「ツール開発用」にするなら、次の一手としては **(A) discsort/lc/子供パラメータの確定** と、**(B) URL→条件のパーサ実装仕様（エラー時のフォールバック方針）** を追加すると、そのまま実装に落としやすいです。

## □Expedia

以下は、いただいた **Expedia「ホテル検索結果」URL** のクエリパラメータを分解し、**そのまま要件定義書に貼れる形**に落とし込んだドラフトです（※一部、Expediaの公開ドキュメントに明確な定義が無い項目は **推定** と明記します）。

---

## 1. 対象URL（スコープ）

- 対象ページ：Expedia 宿泊（Stays）の **検索結果一覧ページ**
- URL例（今回の入力）
    
    `https://www.expedia.co.jp/Hotel-Search?...`
    

---

## 2. 目的（このURLを扱う機能のゴール）

### ゴール

ユーザーが指定した条件（行き先・日付・人数など）を **URLパラメータとしてシリアライズ**し、Expediaの検索結果ページを同一条件で再現できるようにする。

### 想定ユースケース

- 管理画面/拡張機能から「那覇・4/1チェックイン・大人2名・1部屋」等を入力 → Expedia検索結果URLを生成して開く
- 既存のExpedia検索URLを貼り付け → 条件を解析してUIに復元（編集→再生成）

---

## 3. パラメータ仕様（辞書）

> 優先度：
> 
> 
> **MUST**＝必須、**SHOULD**＝基本入れる、**MAY**＝あれば使う（無くても動く/不安定）
> 

### 3.1 ロケーション系

| Param | 優先度 | 型 | 例 | 意味/用途 |
| --- | --- | --- | --- | --- |
| `destination` | SHOULD | string(URLエンコード) | `那覇, 沖縄県,日本` | 画面表示用の目的地文字列。ロケール依存のため、識別子としては弱い（表示用途向き）。 |
| `regionId` | MUST | int | `2655` | 目的地を表す **Region ID**。Expedia側でも地域指定のキーとして使われる。 ([developers.expediagroup.com](https://developers.expediagroup.com/white-label-template/traffic-growth/deeplinking/lodging-deeplinks)) |
| `latLong` | MAY | string(`lat,long`) | `26.212313,127.679152` | 検索中心の緯度経度。Expediaの検索でも緯度経度指定が一般に使われる。 ([developers.expediagroup.com](https://developers.expediagroup.com/travel-redirect-api/api/shopping-apis/lodging-listings?utm_source=chatgpt.com)) |
| `typeaheadCollationId` | MAY | uuid | `91ad...` | **推定**：Typeahead（サジェスト）選択と検索を紐づける内部ID。名前が「typeahead」で、Expedia GroupにTypeahead機能/APIがあるためそう推測。無くても検索は成立する想定。 ([developers.expediagroup.com](https://developers.expediagroup.com/white-label-template/traffic-growth/typeahead?locale=ja_JP&utm_source=chatgpt.com)) |

### 3.2 日付系

| Param | 優先度 | 型 | 例 | 意味/用途 |
| --- | --- | --- | --- | --- |
| `startDate` | MUST | date(YYYY-MM-DD) | `2026-04-01` | チェックイン日（検索期間開始）。 |
| `endDate` | MUST | date(YYYY-MM-DD) | `2026-04-02` | チェックアウト日（検索期間終了）。 |
| `d1` | SHOULD | date(YYYY-MM-DD) | `2026-04-01` | **推定**：`startDate` の同義/互換用（同値で併記されているため）。 |
| `d2` | SHOULD | date(YYYY-MM-DD) | `2026-04-02` | **推定**：`endDate` の同義/互換用（同値で併記されているため）。 |
| `flexibility` | MAY | enum | `0_DAY` | **推定**：日付の柔軟検索（±n日）指定。`0_DAY`は柔軟性なし。名称と値から推測。 |

> 参考：Expedia Groupのdeeplink仕様では日付は `yyyy-mm-dd` 形式で統一され、先の日程検索にも上限がある旨が記載されています（※/go/hotel/search仕様だが日付扱いの考え方は近い）。 ([developers.expediagroup.com](https://developers.expediagroup.com/white-label-template/traffic-growth/deeplinking/lodging-deeplinks))
> 

### 3.3 人数・部屋数

| Param | 優先度 | 型 | 例 | 意味/用途 |
| --- | --- | --- | --- | --- |
| `adults` | MUST | int | `2` | 大人の合計人数（簡易指定）。 |
| `rooms` | MUST | int | `1` | 部屋数（簡易指定）。 |

> 将来拡張：Expedia Groupのdeeplink仕様では「部屋ごとの大人/子供/子供年齢」を部屋単位で持てます（例：`NumAdult-Room1` 等）。本格対応したい場合は、内部モデルは部屋配列で持つのが安全です。 ([developers.expediagroup.com](https://developers.expediagroup.com/white-label-template/traffic-growth/deeplinking/lodging-deeplinks))
> 

### 3.4 並び替え・フィルタ・その他

| Param | 優先度 | 型 | 例 | 意味/用途 |
| --- | --- | --- | --- | --- |
| `sort` | SHOULD | enum | `RECOMMENDED` | 並び替え。ページ上でも「recommended」ソートであることが表示される。 |
| `theme` | MAY | string | 空 | **推定**：テーマ/カテゴリ（例：family/luxury等）系のフィルタ枠。空でも成立。 |
| `categorySearch` | MAY | string | 空 | **推定**：カテゴリ検索の内部フラグ。空でも成立。 |
| `useRewards` | MAY | boolean | `false` | **推定**：リワード/会員特典を検索に反映するか。One Key文脈のUIがあるためその系統と推測。 |
| `userIntent` | MAY | string | 空 | **推定**：検索意図の内部分類。空でも成立。 |
| `semdtl` | MAY | string | 空 | **推定**：SEM（広告）由来のトラッキング詳細。空でも成立。 |

---

## 4. 正規化ルール（内部データモデル）

### 4.1 内部モデル（推奨）

URLの揺れを吸収するため、内部は次の **正規化モデル**で保持：

```json
{
  "destinationLabel": "那覇, 沖縄県,日本",
  "regionId": 2655,
  "latLong": {"lat": 26.212313, "lng": 127.679152},
  "checkIn": "2026-04-01",
  "checkOut": "2026-04-02",
  "rooms": 1,
  "adults": 2,
  "sort": "RECOMMENDED",
  "flexibility": "0_DAY",
  "useRewards": false,
  "passthrough": {
    "typeaheadCollationId": "91ad...",
    "theme": "",
    "userIntent": "",
    "semdtl": "",
    "categorySearch": ""
  }
}
```

### 4.2 同義パラメータの扱い（必須仕様）

- `checkIn` は **`startDate` を優先**して採用
    - `startDate` が無い場合 `d1` を採用
- `checkOut` は **`endDate` を優先**して採用
    - `endDate` が無い場合 `d2` を採用
- URL生成時は互換性目的で **`startDate/endDate` + `d1/d2` を同値で両方出力**（※これは観測ベースの推奨。Expedia側の実装が変わる可能性はあるため、生成オプションとしてON/OFF可能にしても良い）

---

## 5. URL生成（シリアライズ）要件

### 5.1 必須出力

- `regionId`
- `startDate`, `endDate`
- `adults`, `rooms`

### 5.2 推奨出力

- `destination`（表示一致のため）
- `d1`, `d2`（互換性のため：上記の通りON/OFF可）
- `sort`（UI意図を固定したい場合）

### 5.3 任意（パススルー）

- `typeaheadCollationId` などの内部/トラッキング系は **保存しない設計**でも良い
    - 理由：安定性が低く、将来無効化される可能性がある（推定）。
    - ただし「URLを改変しても検索結果の揺れを最小化したい」なら、入力URLに含まれる限りは `passthrough` として保持して再出力できるようにする。

---

## 6. URL解析（パース）要件

### 入力

- 文字列URL（`https://www.expedia.co.jp/Hotel-Search?...`）

### 出力

- 4章の正規化モデルに変換

### パース仕様

- URLデコードして `destination` を復元（`,` と空白を含む）
- `latLong` は `,` 分割し float へ
- boolean：`useRewards` は `true/false` を厳密に解釈（不正値は null）
- 未知パラメータは `passthrough.unknown` に格納（将来拡張・デバッグ用途）

---

## 7. バリデーション要件（最小）

- 日付
    - `checkIn < checkOut` を必須
    - 形式は `YYYY-MM-DD` のみ許可
- 人数
    - `adults >= 1`
    - `rooms >= 1`
- `regionId` は整数のみ
- `latLong` がある場合：`90<=lat<=90`, `180<=lng<=180`

> 参考：Expedia Groupのdeeplink仕様では部屋数上限（最大8）や日付形式が示されています。今回の `Hotel-Search` でも上限は近い可能性が高いので、上限値は設定可能（コンフィグ）にしておくのが安全です。 ([developers.expediagroup.com](https://developers.expediagroup.com/white-label-template/traffic-growth/deeplinking/lodging-deeplinks))
> 

---

## 8. 受け入れ条件（テストケース）

### TC1（提示URLのラウンドトリップ）

- Given：今回のURL
- When：parse → build（同等条件で再生成）
- Then：検索結果ページが同一条件（那覇/2026-04-01〜04-02/大人2/1部屋）で開ける

### TC2（destination無し）

- Given：`regionId` + `startDate/endDate` + `adults/rooms` のみ
- Then：検索が成立する（表示上の目的地はExpedia側解決）

### TC3（d1/d2のみ）

- Given：`d1/d2` のみで `startDate/endDate` 無し
- Then：内部 checkIn/checkOut が復元される

### TC4（latLongあり/なし）

- Given：latLong あり/なし
- Then：両方でURL生成可能、ありの場合は地図中心が安定

---

## 9. 補足：長期運用なら「公式deeplink」も選択肢

Expedia Groupには、検索条件をURLに埋め込む「deeplink」仕様やBuilder Toolの案内があり、**安定したリンク生成**という意味ではこちらの方が運用しやすいケースがあります。 ([developers.expediagroup.com](https://developers.expediagroup.com/white-label-template/traffic-growth/deeplinking))

（今回の `Hotel-Search` 方式を残しつつ、将来 `go/hotel/search` 方式へ切替できるように、内部モデルを正規化しておくのが堅いです）

---

必要なら次に、上の要件定義をそのまま実装に落とせるように

- **パーサ関数仕様（入出力・例外）**
- **URLビルダ関数仕様**
- **（Chrome拡張/デスクトップアプリ想定の）UI項目一覧と画面遷移**

まで、コードに落とす直前の粒度で書きます。

## □Booking.com

## Booking.com 検索結果URLパラメータ分析（要件定義書に転用できる形）

### 1. 対象URL（入力例）

`/searchresults.ja.html`（検索結果ページ）

```
https://www.booking.com/searchresults.ja.html
?ss=沖縄県
&ssne=沖縄県
&ssne_untouched=沖縄県
&efdco=1
&label=...
&aid=304142
&lang=ja
&sb=1
&src_elem=sb
&src=searchresults
&dest_id=2351
&dest_type=region
&checkin=2026-04-01
&checkout=2026-04-02
&group_adults=2
&no_rooms=1
&group_children=0
```

---

### 2. 目的

Booking.comの検索結果URLを **(A) URL→検索条件へ復元** / **(B) 検索条件→URL生成** できるようにし、

要件定義書として「必須パラメータ」「推奨パラメータ」「トラッキング系（任意）」を分離して仕様化する。

---

### 3. パラメータ分類（結論）

- **検索再現に必須**：`dest_id`, `dest_type`, `checkin`, `checkout`, `group_adults`, `no_rooms`, `group_children`
- **検索の見た目/入力文字列の保持（推奨）**：`ss`, `ssne`, `ssne_untouched`, `lang`
- **計測・流入・ABテスト等（任意/原則保持しなくてOK）**：`aid`, `label`, `sb`, `src`, `src_elem`, `efdco`

※ `aid` と `label` はBookingの流入計測（アフィリエイト/キャンペーン）用途で使われることが多く、検索条件そのものには影響しないケースが多いです（この判断はURLの性質からの**推定**。理由：検索条件と無関係な長いトークンや固定値が多く、他サイトでも同種の命名が一般的なため）。

---

### 4. パラメータ辞書（要件定義用）

### 4.1 目的地（Destination）

| パラメータ | 型 | 例 | 必須 | 意味/仕様 |
| --- | --- | --- | --- | --- |
| `dest_id` | int | `2351` | **必須** | 目的地の内部ID。`dest_type`とセットで最優先に使用（安定）。 |
| `dest_type` | enum | `region` | **必須** | 目的地種別。例：`region / city / country / hotel / landmark` 等（想定）。 |
| `ss` | string | `沖縄県` | 推奨 | 検索ボックスに表示される検索語（人が読む用）。URLエンコードされる。 |
| `ssne` | string | `沖縄県` | 任意 | `ss`と同一のことが多い表示名。オートコンプリートの確定後表示に使われることが多い（**推定**。理由：`ssne_untouched`とセットで出ることが多いため）。 |
| `ssne_untouched` | string | `沖縄県` | 任意 | 入力元文字列（補正前）を保持する用途が多い（**推定**）。 |

**優先順位（復元ロジック）**

1. `dest_id` + `dest_type` があればそれを採用（`ss`系は表示用）
2. 無い場合は `ssne_untouched` → `ssne` → `ss` の順で目的地検索を試みる

---

### 4.2 宿泊日（Dates）

| パラメータ | 型 | 例 | 必須 | 意味/仕様 |
| --- | --- | --- | --- | --- |
| `checkin` | date(YYYY-MM-DD) | `2026-04-01` | **必須** | チェックイン日 |
| `checkout` | date(YYYY-MM-DD) | `2026-04-02` | **必須** | チェックアウト日（`checkin`より後） |

**バリデーション**

- `checkout` <= `checkin` はエラー（または自動補正するなら「+1日」補正ルールを仕様化）
- 日付フォーマット不正はエラー

---

### 4.3 人数・部屋（Occupancy）

| パラメータ | 型 | 例 | 必須 | 意味/仕様 |
| --- | --- | --- | --- | --- |
| `group_adults` | int | `2` | **必須** | 大人の合計人数 |
| `group_children` | int | `0` | **必須** | 子供の合計人数 |
| `no_rooms` | int | `1` | **必須** | 部屋数 |

**バリデーション（現実的な仕様）**

- `group_adults`：1以上
- `no_rooms`：1以上
- `group_children`：0以上
- 上限はBooking側仕様に依存するため、アプリ側は「上限超過はエラー」か「上限で丸める」かを選べるようにしても良い

**重要な拡張（子供がいる場合）**

- `group_children > 0` のとき、子供の年齢パラメータが別途必要になることが多いです（例：`age=5&age=7` のような繰り返し）。
    
    このURLには無いので、実装側では
    
    - ① 年齢が必要な場合はUIで入力させる
    - ② 不明なら「年齢未設定」扱いでURL生成しない（エラー）
        
        のどちらかを要件として固定するのがおすすめです。
        
        （**推定**。理由：多くの宿泊検索で子供料金計算に年齢が必須なため）
        

---

### 4.4 言語・表示（Localization）

| パラメータ | 型 | 例 | 必須 | 意味/仕様 |
| --- | --- | --- | --- | --- |
| `lang` | string | `ja` | 推奨 | 表示言語。パスも `searchresults.ja.html` なので冗長だが、明示すると安定しやすい。 |

---

### 4.5 流入/計測（Tracking / Attribution）※任意

| パラメータ | 型 | 例 | 必須 | 意味/仕様 |
| --- | --- | --- | --- | --- |
| `aid` | int | `304142` | 任意 | アフィリエイト/提携IDの可能性が高い（**推定**）。検索条件には無関係なことが多い。 |
| `label` | string | 長いトークン | 任意 | キャンペーン/計測ラベルの可能性（**推定**）。 |
| `src` | string | `searchresults` | 任意 | 流入元ページ種別。 |
| `src_elem` | string | `sb` | 任意 | 流入元UI要素（search boxなど）。 |
| `sb` | int/bool | `1` | 任意 | searchbox起点フラグのような用途（**推定**）。 |
| `efdco` | int/bool | `1` | 任意 | 何らかの機能フラグ/実験フラグの可能性（**推定**）。 |

**扱いの推奨**

- 自社ツールで「検索条件の再現」が目的なら、**tracking系は保存対象外**（または “保持する/しない” を設定化）
- ただし提携リンクとして使うなら `aid` / `label` を保持する要件に切り替える

---

### 5. 仕様（URL→条件復元 / 条件→URL生成）

### 5.1 URL→検索条件へ復元（パース）

**入力**：Booking検索結果URL

**出力（例：内部モデル）**

- destination: `{ dest_id, dest_type, query_text }`
- stay: `{ checkin, checkout }`
- occupancy: `{ adults, children, rooms, children_ages? }`
- locale: `{ lang }`
- tracking: `{ aid, label, src, src_elem, sb, efdco }`（任意）

**未知パラメータ**

- 仕様変更に強くするため、未知のクエリは `passthrough_params` に保持できる設計が安全

---

### 5.2 検索条件→URL生成（ビルド）

**必ず付与する**：`dest_id`, `dest_type`, `checkin`, `checkout`, `group_adults`, `group_children`, `no_rooms`

**推奨で付与**：`ss`（表示用）, `lang`

**任意**：tracking系（提携リンク用途なら付与）

---

### 6. 受入条件（Given/When/Then）

1. **基本復元**
- Given: 上記URL
- When: パースする
- Then: `dest_id=2351`, `dest_type=region`, `checkin=2026-04-01`, `checkout=2026-04-02`, `adults=2`, `rooms=1`, `children=0` が復元できる
1. **日付バリデーション**
- Given: `checkout` が `checkin` と同日 or 以前
- When: パース/生成
- Then: エラー（または補正）ルール通りに動作する
1. **子供年齢**
- Given: `group_children>0` だが年齢情報が無い
- When: URL生成
- Then: 要件で定めた挙動（エラー or 年齢入力要求）になる
1. **trackingの扱い**
- Given: `aid/label` 等あり
- When: “保持しない設定” で正規化URLを生成
- Then: 検索条件が同一のURLが生成され、trackingは除去される

---

### 7. 実装メモ（要件として書いておくと事故が減る）

- URLデコードは **UTF-8のパーセントデコード**（`ss`等の日本語）
- `dest_id` + `dest_type` がある場合、`ss`系は **表示・ログ用途**に留める（検索の正はID）
- Booking側が新しいパラメータを追加しても壊れないよう、**未知パラメータは破棄せず保持**できる設計が望ましい

---

必要なら、次の返答でこの内容を **そのまま貼れる「要件定義書テンプレ（章立て・目的・範囲・前提・IF・例外・テスト）」** に整形した版も出します（今回の内容をベースに、ドキュメントとして完成形にします）。

## □Agoda

以下、「Agoda 検索URL（/ja-jp/search）」のクエリパラメータを **“要件定義書にそのまま貼れる粒度”** で整理したドラフトです。

※いくつかの項目は Agoda 側が公開ドキュメント化していないため **推定** になります（推定の理由も併記します）。

---

## 1. 対象URL（入力例）

`https://www.agoda.com/ja-jp/search?...`（クエリ計42項目）

目的地：`textToSearch=那覇・本島南部` / `region=980`

日程：`checkIn=2026-04-01` / `checkOut=2026-04-02`（`los=1`）

---

## 2. 目的（この仕様で実現したいこと）

1. Agoda 検索URLをツール側で **安全に保存・再利用（再生）** できる
2. 目的地・日付・人数など **本質条件だけを編集** できる
3. URL内の **個体識別/セッション系パラメータを除去** し、共有・ログ保管しても問題が起きにくい “正規化URL” を生成できる
4. Agoda側の仕様変更に備え、パラメータ方針（保持/削除）を **設定で差し替え可能** にする

---

## 3. 前提・注意点

- `correlationId` は Agoda のAPIレスポンス等で “CorrelationID” として使われる識別子が確認でき、リクエスト追跡用途の可能性が高い（= URLにあっても検索条件そのものではない）ため、基本は削除対象とする。 ([Direct Supply](https://developer.agoda.com/supply/reference/get-contract))
- 一般に URL にはトラッキング目的のパラメータが混入しうるため、**共有/保存用は除去する設計が安全**（＝“正規化URL” を作る） ([GitHub](https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/TrackParamFilter/sections/specific.txt))
- `ds` は短いトークン形式で、検索状態の署名/圧縮データ等の可能性があるため **推定**。多くの場合、無くても Agoda 側が再生成するか、リダイレクトで補完されることがある（= 揮発扱いが妥当）という判断。

---

## 4. パラメータ分類ポリシー（要件の核）

### 4.1 “正規化URL” の基本方針（推奨）

- **KEEP（保持）**：検索条件・表示条件として再現に必要なもの
- **DERIVE（派生）**：他項目から再計算できるもの（例：`los`）
- **DROP（削除）**：個体識別・セッション・端末/環境・内部計測
- **OPTIONAL（任意保持）**：アフィリエイト/流入分析など、必要時のみ保持

---

## 5. パラメータ定義（データ辞書）

### 5.1 コア検索条件（KEEP / DERIVE）

| param | 例 | 意味 | 取扱い | バリデーション/備考 |
| --- | --- | --- | --- | --- |
| `region` | `980` | 地域ID（**推定**：目的地選択の内部ID。数値で安定しているため） | KEEP | 数値。`textToSearch` と併用推奨 |
| `textToSearch` | `那覇・本島南部` | 検索文字列（表示/検索補助） | KEEP | URLエンコード/デコード必須 |
| `checkIn` | `2026-04-01` | チェックイン日 | KEEP | `YYYY-MM-DD` |
| `checkOut` | `2026-04-02` | チェックアウト日 | KEEP | `checkOut > checkIn` |
| `los` | `1` | 宿泊数（**推定**：Length of stay） | DERIVE | `dateDiff(checkIn, checkOut)` で再計算。矛盾時は上書き |
| `rooms` | `1` | 室数 | KEEP | `>=1` の整数 |
| `adults` | `2` | 大人 | KEEP | `>=1` の整数（Agoda仕様に合わせ可変） |
| `children` | `0` | 子供 | KEEP | `>=0` の整数 |
| `productType` | `-1` | 商品タイプ（**推定**：-1=全て等） | KEEP（任意） | 既定値なら省略可 |
| `travellerType` | `1` | 旅行者タイプ（**推定**） | KEEP（任意） | 既定値なら省略可 |
| `familyMode` | `off` | ファミリー表示モード等（**推定**） | KEEP（任意） | `on/off` |

### 5.2 ローカライズ/通貨（KEEP ただし重複は正規化）

| param | 例 | 意味 | 取扱い | 備考 |
| --- | --- | --- | --- | --- |
| `locale` | `ja-jp` | 表示ロケール | KEEP | UI言語・表示形式に影響 |
| `currency` | `JPY` | 表示通貨（**推定**） | KEEP（どれか1つに統一） | `currencyCode`/`priceCur` と重複しがち |
| `currencyCode` | `JPY` | 表示通貨コード | KEEP（統一先候補） | 正規化ではこれを採用すると分かりやすい |
| `currencyId` | `11` | 通貨ID（**推定**） | DROP（原則） | `JPY` があれば再現できる可能性が高い |
| `priceCur` | `JPY` | 価格表示通貨（**推定**） | DROP or KEEP | `currencyCode` と同値なら省略可 |
| `htmlLanguage` | `ja-jp` | HTML言語（**推定**） | DROP（原則） | `locale` と重複 |
| `cultureInfoName` | `ja-jp` | 文化圏（**推定**） | DROP（原則） | `locale` と重複 |
| `languageId` | `6` | 言語ID（**推定**：ja-jp=6） | DROP | `locale` で十分 |
| `realLanguageId` | `6` | 実言語ID（**推定**） | DROP | 同上 |
| `origin` | `JP` | 流入国/利用国（**推定**） | KEEP（任意） | 場合により価格/在庫に影響する可能性があるので “任意保持” 推奨 |

### 5.3 アフィリエイト/流入（OPTIONAL）

| param | 例 | 意味 | 取扱い | 備考 |
| --- | --- | --- | --- | --- |
| `aid` | `130589` | アフィリエイトID等（**推定**） | OPTIONAL | 収益/計測が目的なら保持 |
| `cid` | `1844104` | キャンペーン/チャネルID等（**推定**） | OPTIONAL | 同上 |
| `trafficGroupId` | `1` | 流入セグメント（**推定**） | DROP（原則） | 再現性より追跡寄り |
| `trafficSubGroupId` | `84` | 流入サブセグメント（**推定**） | DROP（原則） | 同上 |
| `whitelabelid` | `1` | ホワイトラベル識別（**推定**） | OPTIONAL | 提携サイト経由の再現が必要なら保持 |
| `storefrontId` | `3` | ストアフロント識別（**推定**） | OPTIONAL | 画面や価格ロジックに影響する可能性 |

### 5.4 セッション/端末/内部状態（DROP：保存・共有禁止推奨）

| param | 例 | 意味 | 取扱い | 理由 |
| --- | --- | --- | --- | --- |
| `ckuid` | UUID | Cookie/訪問者ID（**推定**） | DROP | 個体識別の可能性が高い |
| `userId` | UUID | ユーザーID（**推定**） | DROP | `ckuid` と同値で個体識別の可能性 |
| `correlationId` | UUID | リクエスト相関ID（追跡） | DROP | 相関IDは追跡用途の例がある ([Direct Supply](https://developer.agoda.com/supply/reference/get-contract)) |
| `analyticsSessionId` | 数値 | 分析セッションID（**推定**） | DROP | セッション揮発 |
| `machineName` | `hk-pc-...` | 配信サーバ/ノード名（**推定**） | DROP | 環境依存・揮発 |
| `browserFamily` | `Chrome` | ブラウザ種別 | DROP | 環境依存 |
| `cdnDomain` | `agoda.net` | CDNドメイン | DROP | 環境依存 |
| `mode` | `production` | 実行モード | DROP | 再現に不要 |
| `loginLvl` | `0` | ログイン状態（**推定**） | DROP | セッション依存 |
| `useFullPageLogin` | `true` | ログインUI切替（**推定**） | DROP | セッション/体験寄り |
| `isRealUser` | `true` | ボット判定補助（**推定**） | DROP | 内部計測寄り |
| `pageTypeId` | `103` | ページ種別ID（**推定**） | DROP | 内部実装寄り |
| `prid` | `0` | 内部ID（不明） | DROP | 意味が不明で再現性に寄与しにくい |
| `cttp` | `4` | クリック/遷移種別（**推定**） | DROP | 計測寄り |

### 5.5 揮発トークン（DROP ただし “完全再生モード” なら保持可）

| param | 例 | 意味 | 取扱い | 備考 |
| --- | --- | --- | --- | --- |
| `ds` | `ktcAk...` | 状態トークン/署名/圧縮（**推定**） | DROP（原則） | 失敗時のフォールバックとして “保持” を選べる設計に |

---

## 6. 正規化URL生成仕様（必須要件）

### 6.1 正規化URLの出力（推奨テンプレ）

**Base**：`https://www.agoda.com/ja-jp/search`

**Query（最小保持セット）**：

- `locale`
- `region` または `textToSearch`（可能なら両方）
- `checkIn`, `checkOut`
- `rooms`, `adults`, `children`
- `currencyCode`（or `currency` どちらかに統一）
- 任意：`productType`, `travellerType`, `familyMode`, `origin`

例（共有用・追跡除去）：

```
https://www.agoda.com/ja-jp/search
?locale=ja-jp
&region=980
&textToSearch=%E9%82%A3%E8%A6%87%E3%83%BB%E6%9C%AC%E5%B3%B6%E5%8D%97%E9%83%A8
&checkIn=2026-04-01
&checkOut=2026-04-02
&rooms=1&adults=2&children=0
&currencyCode=JPY
&productType=-1&travellerType=1&familyMode=off
```

### 6.2 正規化ルール

- パラメータは **Allowlist方式**（KEEP/OPTIONALだけを出力）
- `los` は出力しても良いが、入力と矛盾したら **再計算して上書き**（DERIVE）
- 重複系（`currency`/`currencyCode`/`priceCur`）は **内部モデルでは1つに統一**
- 値は **UI表示ではデコード**、URL生成では **必ずエンコード**
- unknown param は
    - “原文URLの保管” には残す（監査・再調査用）
    - “共有URL/ログ” には出さない（安全優先）

---

## 7. 編集機能（UI/API要件）

### 7.1 必須編集項目

- 目的地：`textToSearch`, `region`
- 日付：`checkIn`, `checkOut`
- 人数/室数：`rooms`, `adults`, `children`
- ロケール/通貨：`locale`, `currencyCode`

### 7.2 任意（トグルでON/OFF）

- アフィリエイト保持：`aid`, `cid`, `whitelabelid`, `storefrontId`
- “完全再生モード”：`ds` を含めて生成（ただし期限切れや不整合の可能性をUI注意書き）

---

## 8. 受入条件（Given/When/Then）

1. **URL解析**
- Given：上記のAgoda URLを入力
- When：解析を実行
- Then：42パラメータが一覧表示され、KEEP/DROP/OPTIONAL/DERIVE に分類される
1. **正規化URL生成**
- Given：解析済み
- When：「共有用URLを生成」
- Then：`ckuid/userId/correlationId/analyticsSessionId/machineName` 等が除去され、コア条件だけのURLが生成される
1. **日付編集**
- Given：`checkIn/checkOut` を変更
- When：保存
- Then：`los` が差分日数に自動追従し、`checkOut <= checkIn` はエラー表示
1. **アフィリエイト保持トグル**
- Given：アフィリエイト保持=ON
- When：共有用URL生成
- Then：`aid/cid` 等が含まれる（ただし個体識別系は含まれない）
1. **ログ/保存の安全性**
- Given：ログ出力が有効
- When：URLを保存
- Then：DROP対象パラメータはログに出力されない（またはマスクされる）

---

## 9. セキュリティ/プライバシー要件（重要）

- `ckuid`, `userId`, `correlationId`, `analyticsSessionId`, `machineName`, `ds` は **機微/揮発情報** として扱い、
    - 共有用URL・監査ログ・DB保存（検索条件保存）には **原則含めない**
    - どうしても必要な場合は “完全再生モード” に閉じ、**保存先を分離**（短期保持・アクセス制限）

---

必要なら次のステップとして、上の内容をそのまま実装に落とせるように：

- **Allowlist/Denylist のJSON雛形**
- **正規化関数の疑似コード（TypeScript / Python）**
- **画面仕様（パラメータ一覧のUI、トグル、コピー動線）**

まで一気に書き起こします。どのツール（デスクトップアプリ / Chrome拡張 / Web管理画面）に載せる想定で要件定義を仕上げるのが一番近いですか？

## □Trip.com

## Trip.com ホテル検索URL パラメータ仕様（要件定義書に転用できる形）

対象URL（分析元）

`/hotels/list?...`（Trip.comのホテル検索結果一覧ページ） ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0))

---

### 1. 目的・スコープ

**目的**：Trip.com のホテル検索結果一覧ページ（`/hotels/list`）に対して、URLクエリから検索条件（エリア、日付、人数、通貨など）を **復元（パース）** でき、また同等の検索条件で **URL生成** できるようにする。

**スコープ（今回のURLで確認できた範囲）**

- 検索条件：目的地（エリア/都市/駅/テーマエリア）、チェックイン/アウト、室数、人数、通貨
- 補助：座標・内部ID・トラッキング系パラメータ

※「必須/任意」は **“このURLと表示から推測できる範囲”** です。Trip.com側の仕様変更や、欠落時の挙動までは未検証なので、断定せずに記載しています。

---

### 2. 画面反映（このURLが表している検索条件）

このURLを開いた画面の検索ボックスには、以下が反映されています：

- 目的地：**沖縄南部**
- 日付：**2026/04/01 → 2026/04/02（1泊）**
- 人数：**1室 / 大人2 / 子供0** ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0))

---

### 3. クエリパラメータ定義（フィールド辞書）

### 3.1 滞在・人数系（検索の核）

| key | 意味 | 型・形式 | 例 | バリデーション/備考 |
| --- | --- | --- | --- | --- |
| `checkIn` | チェックイン日 | `YYYY-MM-DD` | `2026-04-01` | `checkOut`より前 |
| `checkOut` | チェックアウト日 | `YYYY-MM-DD` | `2026-04-02` | `checkIn`より後 |
| `crn` | 室数 | int | `1` | 1以上（画面表示「1室」） ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0)) |
| `adult` | 大人合計 | int | `2` | 1以上（画面表示「大人2名」） ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0)) |
| `children` | 子供合計 | int | `0` | 0以上（画面表示「子供0名」） ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0)) |
| `barCurr` | 表示通貨 | 通貨コード（ISO想定） | `JPY` | 表示・価格計算の通貨 |

> **補足（子供年齢）**：このURLには「子供の年齢」情報は入っていません。施設によって年齢が重要な場合、別パラメータが存在する可能性はありますが、今回のURLからは特定できません（＝要追加調査ポイント）。
> 

---

### 3.2 目的地（ロケーション）系

Trip.comは「地名テキスト」＋「内部ID」＋「searchType/searchValue」の組み合わせで検索地点を特定しているように見えます。

| key | 意味 | 型 | 例 | 備考 |
| --- | --- | --- | --- | --- |
| `countryId` | 国ID（Trip.com内部） | int | `78` | 日本を示す内部IDとして使われている例が複数URLで確認可能 ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0)) |
| `provinceId` | 都道府県/州ID（内部） | int | `11059` | 沖縄系の検索URLで出現 ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0)) |
| `city` | 都市ID（内部） | int | `0` | 今回は都市未指定（0） |
| `cityName` | 都市表示名 | string(URLエンコード) | `日本` | city未指定時の表示補助っぽい（推定） |
| `districtId` | 地区/サブエリアID（内部） | int | `10639` | `searchValue`内にも出現。実質キーの可能性（後述） |
| `searchType` | 検索地点のタイプ | enum(string) | `S` | `S/CT/T/Z`など複数パターンが観測できる ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0)) |
| `searchWord` | 検索地点の表示名 | string(URLエンコード) | `沖縄南部` | 検索ボックスの地名表示に一致 ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0)) |
| `searchValue` | 検索地点の内部表現（複合） | string(複合) | `18 | 10639*18*-1.0 |
| `lat`,`lon` | 緯度・経度 | float | `-1` | **-1は未設定のセンチネル**に見える（推定） |
| `searchCoordinate` | 座標の複数系表現 | string(複合) | `BAIDU_-1_-1_0 | GAODE_-1_-1_0 |

---

### 4. `searchType` の意味（観測ベースの整理）

これはTrip.com公式ドキュメントが見当たらないため **推定** ですが、複数URLと画面表示の対応から、だいたい以下の使い分けに見えます。

| searchType | 何を表すか（推定） | 根拠（観測） |
| --- | --- | --- |
| `S` | キーワード/エリア検索（都道府県配下の“広域エリア名”など） | 今回「沖縄南部」で `S` ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0)) |
| `CT` | 市区町村（City）検索 | 「那覇市」ページが `CT` ([Trip.com](https://jp.trip.com/hotels/list?Allianceid=7003011&SID=254095696&adult=2&barCurr=JPY&children=0&city=92573&cityName=%E9%82%A3%E8%A6%87%E5%B8%82&countryId=78&crn=1&ctm_ref=ix_sb_dl&curr=JPY&districtId=0&domestic=false&listFilters=29~1%2A29%2A1~2%2A2%2C17~5%2A17%2A5%2C80~2~1%2A80%2A2%2A2&locale=ja-JP&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0~GAODE_-1_-1_0~GOOGLE_-1_-1_0~NORMAL_26.2123124_127.6791568_0&searchType=CT&searchValue=19~92573%2A19%2A92573%2A1&searchWord=%E9%82%A3%E8%A6%87%E5%B8%82&travelPurpose=0&trip_sub1=junglia&trip_sub3=D5776458)) |
| `T` | 駅/交通拠点（Train/Transport）検索 | `searchValue`に「東京駅」が入り `T` ([Trip.com](https://jp.trip.com/hotels/list?Allianceid=7003011&SID=254095696&adult=2&barCurr=JPY&children=0&city=228&cityName=%E6%9D%B1%E4%BA%AC%E9%83%BD&citySelection=1&countryId=78&crn=1&ctm_ref=ix_sb_dl&curr=JPY&districtId=0&highPrice=-1&listFilters=29~1%2A29%2A1~2%2A2%2C17~1%2A17%2A1%2C80~2~1%2A80%2A2%2A2%2C5~1%2A5%2A1%2A%E6%9C%9D%E9%A3%9F%E4%BB%98%E3%81%8D&locale=ja-JP&lowPrice=0&provinceId=0&recentSearches=1&searchBoxArg=t&searchCoordinate=BAIDU_35.680833_139.766944_0~GAODE_35.6808333_139.7669444_0~GOOGLE_35.6808333_139.7669444_0~NORMAL_35.6808333_139.7669444_0&searchType=T&searchValue=10~8254862%2A10%2A35.6808333~139.7669444~%E6%9D%B1%E4%BA%AC%E9%A7%85~8254862~hcz~1%2A1&travelPurpose=0&trip_sub1=business_tokyo&trip_sub3=D5776458)) |
| `Z` | テーマエリア/ゾーン/ランドマーク集合（例：TDR周辺） | 浦安ページでロケーションに「東京ディズニーランド/シー」が出て `Z` ([Trip.com](https://jp.trip.com/hotels/list?Allianceid=7003011&SID=254095696&adult=2&barCurr=JPY&children=0&city=35751&cityName=%E6%B5%A6%E5%AE%89%E5%B8%82&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=0&domestic=false&lat=35.6295841150001&listFilters=29~1%2A29%2A1~2%2C17~3%2A17%2A3%2C80~2~1%2A80%2A2%2A2&lon=139.882463853&provinceId=11064&searchBoxArg=t&searchCoordinate=BAIDU_35.6295841150001_139.882463853~GAODE_0_0~GOOGLE_35.6295841150001_139.882463853~NORMAL_35.6295841150001_139.882463853&searchType=Z&searchValue=8~107183090%2A8%2A107183090%2A1&travelPurpose=0&trip_sub1=tokyo-disney&trip_sub3=D5776458)) |

---

### 5. `searchValue` の分解ルール（推定・実務向け）

**結論：`searchValue`は “生成ロジックが不明な複合キー” なので、実装では基本「ブラックボックスとして保持」推奨**です。

理由：`searchType`によって区切り文字（`|`, `*`, `~`）や要素数が変わり、内部IDや座標・フラグが混在しているため、完全な再生成が難しい（＝UIで検索したURLからコピーするのが一番確実）という判断です。

とはいえ、要件定義として最低限扱えるように、**観測できた形**を整理します：

### 5.1 searchType=S（今回）

`searchValue=18|10639*18*-1.0|-1.0|沖縄南部|10639|1*1`

推定フォーマット（分解できる“かもしれない”レベル）：

- 先頭の `18`：地点種別コード（typeCode）
- `10639`：地点IDっぽい数値（districtIdと一致）
- `1.0|-1.0`：座標未設定（lat/lonと整合）
- `沖縄南部`：表示名
- 末尾 `|1*1`：フラグ群（室数等の可能性もあるが、`crn`と重複するため用途不明）

※これは **推定**。根拠は「districtIdやlat/lonが同値で出現」「表示名が含まれる」点です。 ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0))

### 5.2 searchType=CT（那覇市の例）

`searchValue=19~92573*19*92573*1`（都市IDが繰り返し出現） ([Trip.com](https://jp.trip.com/hotels/list?Allianceid=7003011&SID=254095696&adult=2&barCurr=JPY&children=0&city=92573&cityName=%E9%82%A3%E8%A6%87%E5%B8%82&countryId=78&crn=1&ctm_ref=ix_sb_dl&curr=JPY&districtId=0&domestic=false&listFilters=29~1%2A29%2A1~2%2A2%2C17~5%2A17%2A5%2C80~2~1%2A80%2A2%2A2&locale=ja-JP&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0~GAODE_-1_-1_0~GOOGLE_-1_-1_0~NORMAL_26.2123124_127.6791568_0&searchType=CT&searchValue=19~92573%2A19%2A92573%2A1&searchWord=%E9%82%A3%E8%A6%87%E5%B8%82&travelPurpose=0&trip_sub1=junglia&trip_sub3=D5776458))

### 5.3 searchType=T（東京駅の例）

`searchValue=10~8254862*10*35.6808333~139.7669444~東京駅~8254862~hcz~1*1`

→ **駅名＋座標＋ID**が入っている ([Trip.com](https://jp.trip.com/hotels/list?Allianceid=7003011&SID=254095696&adult=2&barCurr=JPY&children=0&city=228&cityName=%E6%9D%B1%E4%BA%AC%E9%83%BD&citySelection=1&countryId=78&crn=1&ctm_ref=ix_sb_dl&curr=JPY&districtId=0&highPrice=-1&listFilters=29~1%2A29%2A1~2%2A2%2C17~1%2A17%2A1%2C80~2~1%2A80%2A2%2A2%2C5~1%2A5%2A1%2A%E6%9C%9D%E9%A3%9F%E4%BB%98%E3%81%8D&locale=ja-JP&lowPrice=0&provinceId=0&recentSearches=1&searchBoxArg=t&searchCoordinate=BAIDU_35.680833_139.766944_0~GAODE_35.6808333_139.7669444_0~GOOGLE_35.6808333_139.7669444_0~NORMAL_35.6808333_139.7669444_0&searchType=T&searchValue=10~8254862%2A10%2A35.6808333~139.7669444~%E6%9D%B1%E4%BA%AC%E9%A7%85~8254862~hcz~1%2A1&travelPurpose=0&trip_sub1=business_tokyo&trip_sub3=D5776458))

### 5.4 searchType=Z（浦安/TDRの例）

`searchValue=8~107183090*8*107183090*1`

→ ランドマーク/ゾーンIDの反復に見える ([Trip.com](https://jp.trip.com/hotels/list?Allianceid=7003011&SID=254095696&adult=2&barCurr=JPY&children=0&city=35751&cityName=%E6%B5%A6%E5%AE%89%E5%B8%82&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=0&domestic=false&lat=35.6295841150001&listFilters=29~1%2A29%2A1~2%2C17~3%2A17%2A3%2C80~2~1%2A80%2A2%2A2&lon=139.882463853&provinceId=11064&searchBoxArg=t&searchCoordinate=BAIDU_35.6295841150001_139.882463853~GAODE_0_0~GOOGLE_35.6295841150001_139.882463853~NORMAL_35.6295841150001_139.882463853&searchType=Z&searchValue=8~107183090%2A8%2A107183090%2A1&travelPurpose=0&trip_sub1=tokyo-disney&trip_sub3=D5776458))

---

### 6. `searchCoordinate` の扱い（実装要件）

`searchCoordinate` は座標系ごとの値を並べた複合文字列です。

- 形式（観測）：
    - 区切り：`|` もしくは `~`（URLによって差がある） ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0))
    - セグメント：`{PROVIDER}_{lat}_{lon}_{flag}`
    - PROVIDER例：`BAIDU`, `GAODE`, `GOOGLE`, `NORMAL`

**実装要件（おすすめ）**

1. パース時は `|` と `~` の両方を区切りとして許容する
2. `lat/lon` が `1` の場合でも、`NORMAL` セグメントに座標が入るケースがある（那覇の例）ため、
    - `lat/lon` が未設定 → `NORMAL` の座標を採用、というフォールバックを入れる ([Trip.com](https://jp.trip.com/hotels/list?Allianceid=7003011&SID=254095696&adult=2&barCurr=JPY&children=0&city=92573&cityName=%E9%82%A3%E8%A6%87%E5%B8%82&countryId=78&crn=1&ctm_ref=ix_sb_dl&curr=JPY&districtId=0&domestic=false&listFilters=29~1%2A29%2A1~2%2A2%2C17~5%2A17%2A5%2C80~2~1%2A80%2A2%2A2&locale=ja-JP&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0~GAODE_-1_-1_0~GOOGLE_-1_-1_0~NORMAL_26.2123124_127.6791568_0&searchType=CT&searchValue=19~92573%2A19%2A92573%2A1&searchWord=%E9%82%A3%E8%A6%87%E5%B8%82&travelPurpose=0&trip_sub1=junglia&trip_sub3=D5776458))

---

### 7. トラッキング/補助パラメータ（検索条件には直接効かない可能性が高い）

| key | 意味（推定） | 例 | 扱い |
| --- | --- | --- | --- |
| `searchBoxArg` | 検索ボックス経由フラグ | `t` | 送る/送らないで検索結果が変わるかは未検証 |
| `ctm_ref` | 参照元（計測） | `ix_sb_dl` | 計測用の可能性が高い |
| `travelPurpose` | 旅行目的 | `0` | enumの可能性（0=未指定？） |
| `domestic` | 国内/海外などの判定 | `false` | boolean文字列。意味は推定（名称から） |

---

## 8. 受入条件（Given / When / Then）

**AC-1：URL→検索条件復元**

- Given：入力として `/hotels/list?...` のURLを受け取る
- When：クエリをパースする
- Then：少なくとも `checkIn/checkOut/crn/adult/children/barCurr/searchType/searchWord` が復元できる
- And：復元結果を画面に反映した場合、検索ボックスの表示（目的地・日付・人数）が一致する ([Trip.com](https://jp.trip.com/hotels/list?adult=2&barCurr=JPY&checkIn=2026-04-01&checkOut=2026-04-02&children=0&city=0&cityName=%E6%97%A5%E6%9C%AC&countryId=78&crn=1&ctm_ref=ix_sb_dl&districtId=10639&domestic=false&lat=-1&lon=-1&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0%7CGAODE_-1_-1_0%7CGOOGLE_-1_-1_0%7CNORMAL_-1_-1_0&searchType=S&searchValue=18%7C10639%2A18%2A-1.0%7C-1.0%7C%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8%7C10639%7C1%2A1&searchWord=%E6%B2%96%E7%B8%84%E5%8D%97%E9%83%A8&travelPurpose=0))

**AC-2：検索条件→URL生成（同等検索）**

- Given：目的地（searchType+searchWord+searchValue）と日付・人数・通貨を持つ
- When：URLを生成する
- Then：Trip.comの一覧ページが同等の検索条件で表示される（少なくとも検索ボックス表示が一致）

---

## 9. 実装メモ（要件として残すと事故が減る）

- `searchValue` は **ブラックボックスで保持**する設計にする（分解・再生成は“できたらラッキー”扱い）
- 文字列系（`searchWord`, `cityName`, `searchValue`）は **UTF-8でURLエンコード必須**（特に `searchValue` は区切り文字を含む）
- `1` / `1.0` は未設定センチネルとして扱う（座標は `searchCoordinate.NORMAL` から復元できる場合あり） ([Trip.com](https://jp.trip.com/hotels/list?Allianceid=7003011&SID=254095696&adult=2&barCurr=JPY&children=0&city=92573&cityName=%E9%82%A3%E8%A6%87%E5%B8%82&countryId=78&crn=1&ctm_ref=ix_sb_dl&curr=JPY&districtId=0&domestic=false&listFilters=29~1%2A29%2A1~2%2A2%2C17~5%2A17%2A5%2C80~2~1%2A80%2A2%2A2&locale=ja-JP&provinceId=11059&searchBoxArg=t&searchCoordinate=BAIDU_-1_-1_0~GAODE_-1_-1_0~GOOGLE_-1_-1_0~NORMAL_26.2123124_127.6791568_0&searchType=CT&searchValue=19~92573%2A19%2A92573%2A1&searchWord=%E9%82%A3%E8%A6%87%E5%B8%82&travelPurpose=0&trip_sub1=junglia&trip_sub3=D5776458))

---

必要なら次のターンで、**「Trip.comの検索URLを“最小パラメータ版 / 安定パラメータ版”の2系統で設計」**（どこまで削っても成立しそうか、逆に何を固定で持つべきか）という形に落として、実装用のI/F（SearchRequestのJSONスキーマ）まで一気に固めます。