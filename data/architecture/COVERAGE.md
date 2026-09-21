# Architecture reference coverage

Snapshot: 2026-09-21T19:14:27.791719+00:00

This is source-backed example retrieval. Model weights have not been trained. Counts below describe source records, not unique physical buildings or accurate 3D replicas.

| Dataset | Coverage |
| --- | --- |
| Wikidata building/venue records | 29,376 (24,566 named) |
| Residential class records | 12,499; houses, apartments, and other residences, not exclusively condos |
| Stadium/arena class records | 9,383 stadiums; 2,063 arenas; categories may overlap |
| Supertall/megatall list rows | 276; all rows of the fetched completed/topped-out tables |
| Team-directory venue records | 413 |
| Researched form notes | 9; remaining examples mostly have metadata |
| Populated places above 200,000 | 2,939 |
| Places with a nearby or directly assigned building example | 1,799 |
| Places without one in this snapshot | 1,140 |

A nearby example is within 25 km of the closest indexed place center. A direct example has a Wikidata administrative-location relation. Neither establishes measured municipal boundaries. Population dates vary. Source records can be stale or incomplete.

## Team-directory coverage

These are source directory entries, not independently certified current-season rosters. Missing directory venue links may still have an unverified Wikidata alternative.

| League | Teams | With venue link |
| --- | ---: | ---: |
| National Football League | 32 | 32 |
| Major League Baseball | 30 | 30 |
| National Basketball Association | 30 | 30 |
| National Hockey League | 32 | 32 |
| Women's National Basketball Association | 15 | 15 |
| Major League Soccer | 30 | 30 |
| National Women's Soccer League | 16 | 16 |
| Premier League | 20 | 20 |
| La Liga | 20 | 20 |
| Bundesliga | 18 | 17 |
| Serie A | 20 | 20 |
| Ligue 1 | 18 | 18 |
| Eredivisie | 18 | 18 |
| Primeira Liga | 18 | 18 |
| Campeonato Brasileiro Série A | 20 | 20 |
| Argentine Primera División | 30 | 30 |
| Liga MX | 18 | 18 |
| Saudi Pro League | 18 | 5 |
| J1 League | 20 | 20 |
| A-League Men | 12 | 12 |

Missing directory links:

- Bundesliga: Eintracht Frankfurt
- Saudi Pro League: Abha
- Saudi Pro League: Al Ahli
- Saudi Pro League: Al Diriyah
- Saudi Pro League: Al Faisaly
- Saudi Pro League: Al Fayha
- Saudi Pro League: Al Hazem
- Saudi Pro League: Al Hilal
- Saudi Pro League: Al Ittihad
- Saudi Pro League: Al Khaleej
- Saudi Pro League: Al Nassr
- Saudi Pro League: Al Qadsiah
- Saudi Pro League: Al Riyadh
- Saudi Pro League: Al Shabab

## Import failures

A failed metadata batch does not delete the basic named record. It leaves those additional facts unavailable.

- {"offset": 900, "error": "The read operation timed out"}
- {"offset": 2300, "error": "The read operation timed out"}
- {"offset": 2400, "error": "The read operation timed out"}

## Cities still missing examples

| Place | Country | Recorded population |
| --- | --- | ---: |
| Herāt | AF | 574,300 |
| Kandahār | AF | 523,300 |
| Mazār-e Sharīf | AF | 523,300 |
| Calumbo | AO | 652,270 |
| Camama | AO | 667,094 |
| Cazenga | AO | 394,170 |
| Cuíto | AO | 355,423 |
| Golfe | AO | 655,796 |
| Hoji ya Henda | AO | 642,050 |
| Kikolo | AO | 728,205 |
| Kima Kieza | AO | 428,855 |
| Maianga | AO | 727,681 |
| Malanje | AO | 455,000 |
| Menongue | AO | 251,178 |
| Mulenvos | AO | 882,014 |
| Nova Vida | AO | 464,985 |
| Ramiros | AO | 323,576 |
| Sumbe | AO | 205,832 |
| Talatona | AO | 500,000 |
| Viana | AO | 865,863 |
| Vila Flor | AO | 256,066 |
| Formosa | AR | 222,226 |
| Neuquén | AR | 231,198 |
| Paraná | AR | 247,139 |
| Resistencia | AR | 290,793 |
| San Salvador de Jujuy | AR | 257,970 |
| Bogra | BD | 210,000 |
| Hāthazāri | BD | 498,179 |
| Mohammadpur | BD | 527,571 |
| Nagar Naluākot | BD | 273,000 |
| Savar | BD | 286,008 |
| Tungi | BD | 337,579 |
| Abomey-Calavi | BJ | 385,755 |
| Godomè | BJ | 253,262 |
| Betim | BR | 384,000 |
| Blumenau | BR | 361,261 |
| Boa Vista | BR | 419,652 |
| Cabo de Santo Agostinho | BR | 216,969 |
| Campos dos Goytacazes | BR | 483,540 |
| Carapicuíba | BR | 386,984 |
| Cariacica | BR | 376,200 |
| Caucaia | BR | 378,406 |
| Ceilândia | BR | 287,023 |
| Colombo | BR | 232,212 |
| Cotia | BR | 253,608 |
| Diadema | BR | 403,579 |
| Divinópolis | BR | 231,091 |
| Embu das Artes | BR | 259,788 |
| Florianópolis | BR | 508,826 |
| Foz do Iguaçu | BR | 297,352 |
| Franca | BR | 365,494 |
| Gravataí | BR | 265,074 |
| Guarujá | BR | 294,871 |
| Imperatriz | BR | 273,110 |
| Itaboraí | BR | 240,040 |
| Itapevi | BR | 240,961 |
| Itaquaquecetuba | BR | 369,275 |
| Jacareí | BR | 250,952 |
| João Pessoa | BR | 817,511 |
| Juazeiro | BR | 256,122 |
| Juiz de Fora | BR | 540,756 |
| Lauro de Freitas | BR | 203,331 |
| Londrina | BR | 581,382 |
| Magé | BR | 244,142 |
| Maracanaú | BR | 251,613 |
| Maricá | BR | 211,986 |
| Mauá | BR | 418,261 |
| Mossoró | BR | 264,577 |
| Nova Iguaçu | BR | 843,046 |
| Olinda | BR | 364,717 |
| Palhoça | BR | 222,598 |
| Parauapebas | BR | 305,771 |
| Passo Fundo | BR | 214,811 |
| Paulista | BR | 342,167 |
| Pelotas | BR | 336,150 |
| Petrolina | BR | 418,444 |
| Piracicaba | BR | 440,835 |
| Praia Grande | BR | 367,400 |
| Presidente Prudente | BR | 234,706 |
| Ribeirão das Neves | BR | 346,971 |
| Rio Verde | BR | 241,494 |
| Rondonópolis | BR | 263,708 |
| Santa Luzia | BR | 219,132 |
| Serra | BR | 520,653 |
| Sete Lagoas | BR | 238,909 |
| Sinop | BR | 223,780 |
| Sumaré | BR | 279,545 |
| Suzano | BR | 320,261 |
| São Bernardo do Campo | BR | 840,499 |
| São Gonçalo | BR | 285,439 |
| São José | BR | 295,658 |
| São José de Ribamar | BR | 259,164 |
| São Leopoldo | BR | 209,229 |
| São Vicente | BR | 338,326 |
| Uberaba | BR | 356,781 |
| Valparaíso de Goiás | BR | 218,416 |
| Viamão | BR | 231,996 |
| Volta Redonda | BR | 279,971 |
| Várzea Grande | BR | 300,078 |
| Águas Lindas de Goiás | BR | 245,352 |
| Markham | CA | 338,503 |
| Bandundu Province | CD | 202,904 |
| Boma | CD | 297,009 |
| Bunia | CD | 399,282 |
| Butembo | CD | 286,242 |
| Gandajika | CD | 208,051 |
| Isiro | CD | 255,409 |
| Kabinda | CD | 219,396 |
| Kamina | CD | 200,184 |
| Kikwit | CD | 509,367 |
| Kindu | CD | 234,651 |
| Kolwezi | CD | 790,248 |
| Likasi | CD | 635,768 |
| Masina | CD | 485,167 |
| Matadi | CD | 425,662 |
| Mbuji-Mayi | CD | 2,101,332 |
| Mwene | CD | 295,683 |
| Tshikapa | CD | 634,529 |
| Uvira | CD | 407,092 |
| Bimbo | CF | 348,802 |
| Bégoua | CF | 264,067 |
| Pointe-Noire | CG | 1,032,000 |
| Gagnoa | CI | 277,044 |
| Man | CI | 241,969 |
| Sinfra | CI | 245,226 |
| Quilicura | CL | 210,410 |
| Bamenda | CM | 420,445 |
| Kumba | CM | 225,046 |
| Ankang | CN | 870,126 |
| Anqiu | CN | 364,208 |
| Anshan | CN | 3,325,372 |
| Anshun | CN | 765,313 |
| Anyang | CN | 1,146,839 |
| Aqsu | CN | 535,657 |
| Artux | CN | 285,000 |
| Bachuan | CN | 208,520 |
| Baicheng | CN | 316,970 |
| Baise | CN | 686,078 |
| Baiyin | CN | 294,400 |
| Banan | CN | 508,703 |
| Baoshan | CN | 935,618 |
| Baoshan | CN | 2,265,900 |
| Baotou | CN | 2,761,700 |
| Basuo | CN | 444,458 |
| Bayan Nur | CN | 1,760,000 |
| Bazhong | CN | 2,712,894 |
| Beibei | CN | 247,702 |
| Beihai | CN | 525,329 |
| Bei’an | CN | 436,444 |
| Bengbu | CN | 972,784 |
| Benxi | CN | 865,215 |
| Bijie | CN | 1,137,383 |
| Binzhou | CN | 682,717 |
| Bishan | CN | 204,702 |
| Bole | CN | 235,585 |
| Bozhou | CN | 1,409,436 |
| Changde | CN | 1,457,419 |
| Changle | CN | 259,161 |
| Changsha | CN | 688,242 |
| Changyi | CN | 302,072 |
| Changzheng | CN | 229,925 |
| Changzhi | CN | 699,514 |
| Chaoyang | CN | 410,005 |
| Chaozhou | CN | 1,750,945 |
| Chengde | CN | 920,395 |
| Chengzhong | CN | 265,886 |
| Chifeng | CN | 346,654 |
| Chizhou | CN | 615,274 |
| Chongzuo | CN | 384,905 |
| Chuxiong | CN | 555,081 |
| Chuzhou | CN | 782,671 |
| Chéngguān Qū | CN | 478,275 |
| Dali | CN | 235,305 |
| Dandong | CN | 815,858 |
| Datong | CN | 3,105,591 |
| Daxing’anling | CN | 520,000 |
| Daye | CN | 871,214 |
| Dengzhou | CN | 285,032 |
| Deyang | CN | 735,070 |
| Dezhou | CN | 679,535 |
| Dingxi | CN | 420,614 |
| Dongcun | CN | 658,000 |
| Donghai | CN | 264,709 |
| Dongtai | CN | 262,873 |
| Dongying | CN | 998,968 |
| Enshi | CN | 279,185 |
| E’zhou | CN | 668,727 |
| Fangchenggang | CN | 276,315 |
| Feicheng | CN | 968,100 |
| Fenghuang | CN | 370,000 |
| Fengxiang | CN | 1,140,872 |
| Fuxin | CN | 689,050 |
| Fuyang | CN | 1,768,947 |
| Fuzhou | CN | 1,089,888 |
| Ganzhou | CN | 1,977,253 |
| Gaomi | CN | 391,986 |
| Gaoping | CN | 204,368 |
| Gaozhou | CN | 292,164 |
| Ghulja | CN | 269,158 |
| Gongheyong | CN | 204,881 |
| Guang’an | CN | 858,159 |
| Guankou | CN | 1,380,000 |
| Gucun | CN | 240,185 |
| Guigang | CN | 1,086,327 |
| Guilin | CN | 1,572,300 |
| Gujangbagh | CN | 408,894 |
| Guli | CN | 964,203 |
| Gunan | CN | 208,010 |
| Guyuan | CN | 411,854 |
| Hailar | CN | 211,066 |
| Hami | CN | 246,373 |
| Hancheng | CN | 397,020 |
| Handan | CN | 1,358,318 |
| Hangu | CN | 208,369 |
| Hanzhong | CN | 1,006,557 |
| Hebi | CN | 634,721 |
| Hechi | CN | 330,131 |
| Hechuan | CN | 377,213 |
| Hecun | CN | 494,412 |
| Hegang | CN | 743,307 |
| Hengshui | CN | 522,147 |
| Heyuan | CN | 463,907 |
| Heze | CN | 1,346,717 |
| Hezhou | CN | 1,005,490 |
| Hongjiang | CN | 476,000 |
| Huai'an | CN | 4,556,230 |
| Huaibei | CN | 1,113,321 |
| Huaihua | CN | 552,622 |
| Huanggang | CN | 225,956 |
| Huanggang | CN | 366,769 |
| Huangshan | CN | 460,786 |
| Huangshi | CN | 688,090 |
| Huanren | CN | 229,953 |
| Huayin | CN | 263,352 |
| Hulan Ergi | CN | 265,344 |
| Huludao | CN | 944,495 |
| Hulunbuir | CN | 349,400 |
| Huocheng | CN | 360,000 |
| Jiading | CN | 1,886,100 |
| Jiamusi | CN | 549,549 |
| Jianshui | CN | 490,000 |
| Jiaozhou | CN | 619,266 |
| Jiayuguan | CN | 231,853 |
| Jiexiu | CN | 222,100 |
| Jieyang | CN | 1,899,394 |
| Jilin | CN | 1,895,865 |
| Jinchang | CN | 228,561 |
| Jincheng | CN | 476,945 |
| Jingdezhen | CN | 473,561 |
| Jingling | CN | 224,871 |
| Jingmen | CN | 632,954 |
| Jingzhou | CN | 1,052,282 |
| Jining | CN | 258,757 |
| Jinzhong | CN | 1,226,617 |
| Jiujiang | CN | 1,164,268 |
| Jiuquan | CN | 428,346 |
| Jixi | CN | 403,759 |
| Jiyuan | CN | 242,143 |
| Jizhou | CN | 362,013 |
| Ji’an | CN | 538,699 |
| Kaili | CN | 275,745 |
| Karamay | CN | 261,445 |
| Kashgar | CN | 506,640 |
| Korla | CN | 549,324 |
| Laibin | CN | 910,282 |
| Laiwu | CN | 989,535 |
| Laixi | CN | 341,470 |
| Laiyang | CN | 872,000 |
| Laohekou | CN | 241,431 |
| Leshan | CN | 662,814 |
| Lhasa | CN | 867,900 |
| Lhoka | CN | 353,700 |
| Lianjiang | CN | 1,363,470 |
| Lianshan | CN | 313,247 |
| Lianyungang | CN | 2,001,009 |
| Liaoyang | CN | 687,890 |
| Liaozhong | CN | 395,017 |
| Lincang | CN | 323,708 |
| Linfen | CN | 959,198 |
| Lingyuan | CN | 646,000 |
| Linqu | CN | 299,646 |
| Linxia Chengguanzhen | CN | 274,466 |
| Linyi | CN | 2,743,843 |
| Lishui | CN | 451,418 |
| Liupanshui | CN | 1,320,825 |
| Longling County | CN | 270,000 |
| Longshan | CN | 465,249 |
| Longyan | CN | 1,025,087 |
| Loudi | CN | 497,171 |
| Luancheng | CN | 597,130 |
| Luohe | CN | 1,294,974 |
| Luojiang | CN | 212,186 |
| Lu’an | CN | 1,644,344 |
| Lüliang | CN | 3,346,500 |
| Macheng | CN | 435,076 |
| Maoming | CN | 1,307,802 |
| Ma’anshan | CN | 741,531 |
| Meishan | CN | 1,107,742 |
| Mengzi | CN | 595,100 |
| Mianzhu, Deyang, Sichuan | CN | 510,000 |
| Mingguang | CN | 645,000 |
| Mudanjiang | CN | 665,915 |
| Nada | CN | 256,652 |
| Nanchong | CN | 1,858,875 |
| Nanchuan | CN | 204,775 |
| Nanping | CN | 467,875 |
| Nanqiao | CN | 361,185 |
| Nanyang | CN | 1,811,812 |
| Neijiang | CN | 1,251,095 |
| Nianbo | CN | 260,184 |
| Ningde | CN | 429,260 |
| Ordos | CN | 2,153,638 |
| Panshan | CN | 625,040 |
| Panzhihua | CN | 787,177 |
| Pengze | CN | 350,000 |
| Pingdingshan | CN | 979,130 |
| Pingdu | CN | 542,234 |
| Pingliang | CN | 504,848 |
| Pingxiang | CN | 893,550 |
| Pingyin | CN | 374,900 |
| Pizhou | CN | 343,421 |
| Pu'er | CN | 296,565 |
| Puning | CN | 1,998,619 |
| Putian | CN | 1,539,389 |
| Putuo | CN | 1,239,100 |
| Puyang | CN | 3,590,000 |
| Puyang | CN | 655,674 |
| Qibao | CN | 283,352 |
| Qingpu | CN | 1,271,424 |
| Qingyang | CN | 2,125,400 |
| Qingyuan | CN | 1,738,424 |
| Qingzhou | CN | 236,406 |
| Qinzhou | CN | 1,296,300 |
| Qionghai | CN | 528,238 |
| Qiqihar | CN | 882,364 |
| Qitaihe | CN | 345,033 |
| Quzhou | CN | 902,767 |
| Rizhao | CN | 661,943 |
| Rugao | CN | 257,400 |
| Rui’an | CN | 1,125,000 |
| Sanhe | CN | 965,075 |
| Sanmenxia | CN | 669,307 |
| Sanming | CN | 602,166 |
| Sanya | CN | 1,031,396 |
| Shangluo | CN | 531,696 |
| Shangqiu | CN | 1,859,723 |
| Shangrao | CN | 1,116,486 |
| Shanwei | CN | 491,766 |
| Shaoguan | CN | 1,028,460 |
| Shaoxing | CN | 2,300,000 |
| Shaoyang | CN | 753,194 |
| Shihezi | CN | 572,772 |
| Shiyan | CN | 3,460,000 |
| Shizuishan | CN | 739,400 |
| Shouguang | CN | 473,620 |
| Shuangyashan | CN | 600,000 |
| Shuozhou | CN | 433,700 |
| Siping | CN | 627,957 |
| Sishui | CN | 552,300 |
| Songjiang | CN | 1,973,500 |
| Suicheng | CN | 256,665 |
| Suihua | CN | 252,245 |
| Suining | CN | 656,760 |
| Suizhou | CN | 618,582 |
| Suqian | CN | 1,437,685 |
| Suzhou | CN | 1,647,642 |
| Taicang | CN | 831,113 |
| Taizhou | CN | 1,607,108 |
| Taizhou | CN | 1,485,502 |
| Tanghe | CN | 278,055 |
| Tangshan | CN | 3,372,102 |
| Tantou | CN | 320,304 |
| Tanzhou | CN | 382,445 |
| Tianshui | CN | 1,212,791 |
| Tieling | CN | 459,985 |
| Tongchuan | CN | 417,740 |
| Tongchuanshi | CN | 223,603 |
| Tonghua | CN | 510,000 |
| Tongliao | CN | 261,110 |
| Tongling | CN | 402,062 |
| Turpan | CN | 273,385 |
| Ulanhot | CN | 265,600 |
| Wafangdian | CN | 454,338 |
| Wanning | CN | 545,992 |
| Wanxian | CN | 859,662 |
| Wanzhou | CN | 1,545,900 |
| Wenchang | CN | 560,894 |
| Wenshan City | CN | 450,000 |
| Wuchuan | CN | 907,354 |
| Wuhai | CN | 218,427 |
| Wuwei | CN | 1,010,295 |
| Wuxue | CN | 220,661 |
| Wuzhong | CN | 7,202,654 |
| Wuzhou | CN | 761,948 |
| Xiangtan | CN | 959,303 |
| Xiangxiang | CN | 235,000 |
| Xiangyang | CN | 1,294,733 |
| Xianning | CN | 512,517 |
| Xiantao | CN | 239,406 |
| Xiaogan | CN | 908,266 |
| Xichang | CN | 481,796 |
| Xingtai | CN | 798,770 |
| Xingyi | CN | 322,890 |
| Xinmin | CN | 565,634 |
| Xintai | CN | 222,459 |
| Xinyang | CN | 1,416,800 |
| Xinyi | CN | 300,511 |
| Xinyi | CN | 1,014,577 |
| Xinyuan | CN | 282,718 |
| Xinzhou | CN | 544,683 |
| Xiulin | CN | 240,082 |
| Xuancheng | CN | 774,332 |
| Xuanhua | CN | 373,422 |
| Ya'an | CN | 612,056 |
| Yancheng | CN | 1,615,717 |
| Yanghang | CN | 204,564 |
| Yangjiang | CN | 1,292,987 |
| Yangshuo | CN | 300,000 |
| Yanzhou | CN | 375,500 |
| Yan’an | CN | 475,234 |
| Yibin | CN | 836,340 |
| Yichang | CN | 1,350,150 |
| Yichun | CN | 1,045,952 |
| Yinchuan | CN | 2,859,074 |
| Yingkou | CN | 591,159 |
| Yingtan | CN | 214,229 |
| Yintai | CN | 217,509 |
| Yishui | CN | 1,007,100 |
| Yixing | CN | 1,285,785 |
| Yongji | CN | 452,000 |
| Yongzhou | CN | 1,020,715 |
| Yuanping | CN | 526,000 |
| Yueyang | CN | 991,465 |
| Yunfu | CN | 2,612,800 |
| Yunjinghong | CN | 205,523 |
| Yunlong | CN | 345,393 |
| Zaoyang | CN | 481,004 |
| Zaozhuang | CN | 3,855,601 |
| Zhangjiajie | CN | 441,804 |
| Zhangjiakou | CN | 692,602 |
| Zhangye | CN | 507,433 |
| Zhangzhou | CN | 589,831 |
| Zhaoqing | CN | 1,553,109 |
| Zhaotong | CN | 787,845 |
| Zhongwei | CN | 1,174,600 |
| Zhongxiang | CN | 439,394 |
| Zhoukou | CN | 505,171 |
| Zhoushan | CN | 882,932 |
| Zhu Cheng City | CN | 1,000,000 |
| Zhuanghe | CN | 742,496 |
| Zhucheng | CN | 499,285 |
| Zhumadian | CN | 721,670 |
| Zitong | CN | 212,819 |
| Ziyang | CN | 905,729 |
| Zoucheng | CN | 1,116,692 |
| Armenia | CO | 304,314 |
| Bello | CO | 392,939 |
| Buenaventura | CO | 240,387 |
| Buenaventura | CO | 432,385 |
| Cúcuta | CO | 777,106 |
| Dosquebradas | CO | 206,693 |
| Ibagué | CO | 529,635 |
| Itagüí | CO | 281,853 |
| Sincelejo | CO | 277,773 |
| Soacha | CO | 655,025 |
| Soledad | CO | 342,556 |
| Tuluá | CO | 221,684 |
| Valledupar | CO | 490,075 |
| Arroyo Naranjo | CU | 210,053 |
| Camagüey | CU | 347,562 |
| Guantánamo | CU | 272,801 |
| Holguín | CU | 319,102 |
| Las Tunas | CU | 203,684 |
| Balbala | DJ | 554,350 |
| Djibouti | DJ | 626,512 |
| La Romana | DO | 208,437 |
| San Pedro de Macorís | DO | 217,899 |
| Santo Domingo Este | DO | 700,000 |
| Santo Domingo Oeste | DO | 701,269 |
| Biskra | DZ | 204,661 |
| Djelfa | DZ | 265,833 |
| Ambato | EC | 387,309 |
| Esmeraldas | EC | 218,727 |
| Ibarra | EC | 221,149 |
| Latacunga | EC | 205,624 |
| Manta | EC | 264,281 |
| Riobamba | EC | 264,048 |
| Santo Domingo de los Colorados | EC | 458,580 |
| 6th of October City | EG | 368,650 |
| Al Khuşūş | EG | 488,904 |
| Al ‘Āshir min Ramaḑān | EG | 246,148 |
| Az-Zuhūr | EG | 266,381 |
| Damietta | EG | 305,920 |
| Esna | EG | 462,787 |
| Hurghada | EG | 207,132 |
| Kom Ombo | EG | 409,311 |
| Mallawī | EG | 212,628 |
| Minya | EG | 283,605 |
| Qina | EG | 252,883 |
| Shibīn al Kawm | EG | 267,945 |
| Sohag | EG | 266,944 |
| Tanta | EG | 576,648 |
| Ḩalwān | EG | 230,000 |
| Arba Minch | ET | 201,000 |
| Bishoftu | ET | 207,400 |
| Dessie | ET | 270,400 |
| Jijiga | ET | 483,000 |
| Jimma | ET | 250,900 |
| Shashamane | ET | 208,400 |
| Sodo | ET | 204,100 |
| Warder | ET | 450,400 |
| Atsiaman | GH | 202,932 |
| Sekondi | GH | 285,506 |
| Takoradi | GH | 389,114 |
| Camayenne | GN | 1,871,242 |
| Kankan | GN | 221,428 |
| Nzérékoré | GN | 226,426 |
| Cobán | GT | 212,047 |
| Kwai Chung | HK | 331,600 |
| La Ceiba | HN | 215,973 |
| Carrefour | HT | 511,345 |
| Croix-des-Bouquets | HT | 229,127 |
| Delmas | HT | 395,260 |
| Port-au-Prince | HT | 1,234,742 |
| Port-de-Paix | HT | 306,217 |
| Pétionville | HT | 376,834 |
| Saint-Marc | HT | 266,642 |
| Banjar | ID | 209,791 |
| Batu | ID | 225,408 |
| Bekasi | ID | 2,648,272 |
| Binjai | ID | 279,302 |
| Bitung | ID | 225,134 |
| Ciampea | ID | 207,212 |
| Cileungsir | ID | 289,833 |
| Ciputat | ID | 207,858 |
| Citeureup | ID | 214,668 |
| Dumai | ID | 349,389 |
| Jambi City | ID | 635,101 |
| Kendari | ID | 351,085 |
| Klungkung | ID | 223,720 |
| Kupang | ID | 474,801 |
| Lubuklinggau | ID | 234,166 |
| Padangsidempuan | ID | 243,843 |
| Pangkalpinang | ID | 226,297 |
| Pasarkemis | ID | 263,289 |
| Pematangsiantar | ID | 279,198 |
| Probolinggo | ID | 243,746 |
| Rengasdengklok | ID | 201,463 |
| Singkawang | ID | 253,812 |
| Situbondo | ID | 685,967 |
| Sorong | ID | 219,958 |
| Sukabumi | ID | 365,735 |
| Tanjung Pinang | ID | 227,663 |
| Tegal | ID | 297,173 |
| Toli-Toli | ID | 242,783 |
| Ahilyanagar | IN | 367,140 |
| Akola | IN | 428,857 |
| Alīgarh | IN | 753,207 |
| Ambarnath | IN | 253,475 |
| Amravati | IN | 647,057 |
| Anand | IN | 209,410 |
| Anantapur | IN | 267,161 |
| Arrah | IN | 261,430 |
| Avadi | IN | 345,996 |
| Bathinda | IN | 285,788 |
| Begusarai | IN | 252,008 |
| Belagavi | IN | 490,045 |
| Bharatpur | IN | 252,838 |
| Bhavnagar | IN | 605,882 |
| Bhayandar | IN | 809,378 |
| Bhilai | IN | 627,734 |
| Bhilwara | IN | 359,483 |
| Bhiwandi | IN | 874,032 |
| Bhāgalpur | IN | 400,146 |
| Bhātpāra | IN | 483,129 |
| Bidar | IN | 216,020 |
| Bihār Sharīf | IN | 297,268 |
| Bilimora | IN | 510,879 |
| Bilāspur | IN | 365,579 |
| Bokāro | IN | 564,319 |
| Borivli | IN | 609,617 |
| Brahmapur | IN | 356,598 |
| Burhānpur | IN | 210,886 |
| Chānda | IN | 328,351 |
| Chāpra | IN | 202,352 |
| Cuttack | IN | 610,189 |
| Darbhanga | IN | 296,039 |
| Davangere | IN | 435,128 |
| Dehradun | IN | 522,081 |
| Dewas | IN | 289,550 |
| Dhanbad | IN | 1,196,214 |
| Dhule | IN | 375,559 |
| Dindigul | IN | 292,512 |
| Dombivali | IN | 1,247,327 |
| Durg | IN | 268,806 |
| Eluru | IN | 218,020 |
| Faridabad | IN | 1,414,050 |
| Farrukhābād | IN | 241,152 |
| Fīrozābād | IN | 306,409 |
| Gajuwaka | IN | 258,944 |
| Gaya | IN | 474,093 |
| Ghāziābād | IN | 1,199,191 |
| Gorakhpur | IN | 674,246 |
| Gundupālaiyam | IN | 300,104 |
| Guntur | IN | 670,073 |
| Gāndhīdhām | IN | 247,992 |
| Hosapete | IN | 206,167 |
| Hosūr | IN | 229,528 |
| Hāpur | IN | 242,920 |
| Jalgaon | IN | 460,228 |
| Jammu | IN | 576,198 |
| Jamnagar | IN | 600,943 |
| Jodhpur | IN | 1,056,191 |
| Jālna | IN | 285,577 |
| Jūnāgadh | IN | 319,462 |
| Kalaburagi | IN | 543,147 |
| Kallakurichi | IN | 1,682,687 |
| Kalyān | IN | 1,262,255 |
| Kanchipuram | IN | 221,715 |
| Karnāl | IN | 302,140 |
| Karur | IN | 234,191 |
| Karīmnagar | IN | 289,821 |
| Katihar | IN | 240,838 |
| Khandwa | IN | 200,738 |
| Kharagpur | IN | 219,665 |
| Kirāri Sulemānnagar | IN | 283,211 |
| Korba | IN | 419,146 |
| Kota | IN | 1,001,694 |
| Kulti | IN | 305,405 |
| Kurnool | IN | 460,184 |
| Kushinagar | IN | 274,403 |
| Kākināda | IN | 384,182 |
| Kāmārhāti | IN | 332,965 |
| Latur | IN | 382,940 |
| Loni | IN | 516,082 |
| Maheshtala | IN | 448,317 |
| Malegaon | IN | 481,228 |
| Mangaluru | IN | 499,487 |
| Mango | IN | 223,805 |
| Mathura | IN | 330,511 |
| Mau | IN | 246,050 |
| Meerut | IN | 1,223,184 |
| Mirzāpur | IN | 220,029 |
| Modīnagar | IN | 475,843 |
| Morena | IN | 200,482 |
| Morvi | IN | 210,451 |
| Morādābād | IN | 721,139 |
| Mulugu | IN | 297,671 |
| Munger | IN | 213,303 |
| Murwāra | IN | 221,883 |
| Muzaffarnagar | IN | 349,706 |
| Muzaffarpur | IN | 354,462 |
| Najafgarh | IN | 1,365,000 |
| Nanded | IN | 550,564 |
| Nandyāl | IN | 211,424 |
| Narela | IN | 800,000 |
| Nellore | IN | 547,621 |
| Nizāmābād | IN | 311,152 |
| Nowrangapur | IN | 1,220,946 |
| Nāgercoil | IN | 224,849 |
| Nāngloi Jāt | IN | 205,596 |
| Ongole | IN | 208,344 |
| Pallāvaram | IN | 233,984 |
| Panchkula | IN | 211,355 |
| Panipat | IN | 295,970 |
| Parbhani | IN | 307,170 |
| Punāsa | IN | 350,000 |
| Puri | IN | 200,564 |
| Purnia | IN | 282,248 |
| Pāli | IN | 230,075 |
| Quthbullapur | IN | 225,816 |
| Rajamahendravaram | IN | 376,333 |
| Ramagundam | IN | 242,979 |
| Raurkela Industrial Township | IN | 216,410 |
| Rewa | IN | 235,654 |
| Rohtak | IN | 374,292 |
| Rāichūr | IN | 234,073 |
| Rāmgundam | IN | 452,261 |
| Rāmpur | IN | 296,418 |
| Rānipet | IN | 264,330 |
| Sahāranpur | IN | 484,873 |
| Satna | IN | 282,977 |
| Saugor | IN | 274,556 |
| Secunderabad | IN | 204,182 |
| Shivamogga | IN | 322,650 |
| Shyamnagar | IN | 441,956 |
| Shāhjānpur | IN | 320,434 |
| Singrauli | IN | 220,257 |
| Sivakasi | IN | 234,704 |
| Sonīpat | IN | 289,333 |
| Sri Ganganagar | IN | 237,780 |
| Sāngli | IN | 601,214 |
| Sīkar | IN | 244,497 |
| Thanjavur | IN | 291,067 |
| Thoothukudi | IN | 410,760 |
| Tirunelveli | IN | 1,435,844 |
| Tiruppur | IN | 963,173 |
| Tiruvottiyūr | IN | 249,446 |
| Tumkūr | IN | 307,359 |
| Ujjain | IN | 515,215 |
| Ulhasnagar | IN | 516,584 |
| Uluberiya | IN | 235,345 |
| Vellore | IN | 484,690 |
| Vijayapura | IN | 327,427 |
| Virār | IN | 1,222,390 |
| Vizianagaram | IN | 228,720 |
| Yamuna Nagar | IN | 217,071 |
| Abū Ghurayb | IQ | 900,000 |
| Abū al-Kahṣīb | IQ | 357,771 |
| Al Madīnah | IQ | 255,000 |
| Al Maḩmūdīyah | IQ | 350,000 |
| Kelar | IQ | 250,000 |
| Kashan | IR | 304,487 |
| Khomeynī Shahr | IR | 277,334 |
| Khorramabad | IR | 329,825 |
| Khorramshahr | IR | 330,606 |
| Kāshān | IR | 304,487 |
| Marāgheh | IR | 262,604 |
| Najafābād | IR | 235,281 |
| Nasimshahr | IR | 200,393 |
| Naz̧arābād | IR | 213,388 |
| Pākdasht | IR | 236,319 |
| Shahrīār | IR | 309,607 |
| Sāveh | IR | 220,762 |
| Varāmīn | IR | 225,628 |
| Zanjan | IR | 357,471 |
| Bari | IT | 316,491 |
| Russeifa | JO | 268,237 |
| Aihara | JP | 725,493 |
| Hachinohe | JP | 239,046 |
| Ichihara | JP | 283,531 |
| Isesaki | JP | 211,850 |
| Kasukabe | JP | 229,792 |
| Kure | JP | 214,592 |
| Minamirinkan | JP | 224,015 |
| Nagareyama | JP | 200,136 |
| Nakano | JP | 344,880 |
| Neyagawa | JP | 238,549 |
| Sagamihara | JP | 720,780 |
| Sasebo | JP | 243,223 |
| Shinagawa | JP | 422,488 |
| Suita | JP | 385,567 |
| Sōka | JP | 249,645 |
| Takarazuka | JP | 226,432 |
| Tokorozawa | JP | 344,194 |
| Toyonaka | JP | 401,558 |
| Tsukuba | JP | 241,656 |
| Wakayama | JP | 356,729 |
| Kikuyu | KE | 323,881 |
| Nakuru | KE | 570,674 |
| Ruiru | KE | 490,120 |
| Takeo | KH | 843,931 |
| Changam-ch’on | KP | 207,299 |
| Chongjin | KP | 327,000 |
| Hŭngnam | KP | 346,082 |
| Kaech’ŏn | KP | 319,554 |
| Kanggye | KP | 209,530 |
| Tŏkch’ŏn | KP | 237,133 |
| Ansan-si | KR | 623,256 |
| Geoje | KR | 232,921 |
| Gunpo | KR | 286,485 |
| Masan | KR | 434,371 |
| Mokpo | KR | 268,402 |
| Osan | KR | 238,788 |
| Pyeongtaek | KR | 364,694 |
| Sejong | KR | 394,630 |
| Suncheon | KR | 276,375 |
| Aktobe | KZ | 500,757 |
| Taraz | KZ | 358,153 |
| Monrovia | LR | 1,542,549 |
| Zliten | LY | 203,790 |
| Beni Mellal | MA | 210,397 |
| Fes | MA | 1,191,905 |
| Tétouan | MA | 415,810 |
| Antsirabe | MG | 260,907 |
| Fianarantsoa | MG | 203,105 |
| Koutiala | ML | 218,031 |
| Sikasso | ML | 349,324 |
| Amarapura | MM | 237,618 |
| Bago | MM | 244,376 |
| Hlaingthaya | MM | 687,867 |
| Insein | MM | 247,675 |
| Kalemyo | MM | 348,573 |
| Buenavista | MX | 216,776 |
| Cabo San Lucas | MX | 202,694 |
| Celaya | MX | 340,387 |
| Ciudad Acuña | MX | 216,099 |
| Ciudad Apodaca | MX | 467,157 |
| Ciudad Benito Juárez | MX | 308,285 |
| Ciudad General Escobedo | MX | 454,967 |
| Ciudad López Mateos | MX | 489,160 |
| Ciudad Victoria | MX | 332,100 |
| Coacalco | MX | 277,959 |
| Ecatepec de Morelos | MX | 1,645,352 |
| Gustavo Adolfo Madero | MX | 1,185,772 |
| Gómez Palacio | MX | 257,352 |
| Ixtapaluca | MX | 322,271 |
| La Paz | MX | 250,141 |
| Naucalpan de Juárez | MX | 834,434 |
| Nicolás Romero | MX | 281,799 |
| Nogales | MX | 264,782 |
| Ojo de Agua | MX | 386,290 |
| Puerto Vallarta | MX | 224,166 |
| Santa Catarina | MX | 304,052 |
| Tehuacán | MX | 248,716 |
| Tlalnepantla | MX | 653,410 |
| Tlaquepaque | MX | 650,123 |
| Tláhuac | MX | 305,076 |
| Uruapan | MX | 299,523 |
| Xico | MX | 384,327 |
| Zumpango | MX | 280,455 |
| Bandar Seri Alam | MY | 220,000 |
| Batu Caves | MY | 254,083 |
| Bukit Rahman Putra | MY | 607,000 |
| Iskandar Puteri | MY | 575,977 |
| Kampung Baru Subang | MY | 833,571 |
| Kapar | MY | 269,627 |
| Klang | MY | 240,016 |
| Kluang | MY | 323,762 |
| Kota Damansara | MY | 500,000 |
| Kota Kuala Muda | MY | 544,984 |
| Pasir Mas | MY | 230,424 |
| Pelentong | MY | 583,640 |
| Puchong | MY | 375,181 |
| Sandakan | MY | 439,050 |
| Sepang | MY | 212,050 |
| Setapak | MY | 353,268 |
| Sungai Buloh | MY | 222,858 |
| Sungai Petani | MY | 544,851 |
| Taiping | MY | 217,647 |
| Taman Petaling | MY | 423,062 |
| Tawau | MY | 372,615 |
| Teluk Intan | MY | 232,800 |
| Nacala | MZ | 239,808 |
| Pemba | MZ | 232,932 |
| Zinder | NE | 318,874 |
| Ado-Ekiti | NG | 435,000 |
| Akowonjo | NG | 308,900 |
| Aliayabiagba | NG | 228,000 |
| Bida | NG | 400,000 |
| Ebute Ikorodu | NG | 535,619 |
| Efon-Alaaye | NG | 279,319 |
| Gboko | NG | 365,000 |
| Ijebu Ode | NG | 360,000 |
| Ikare | NG | 465,000 |
| Ikeja | NG | 313,196 |
| Ikire | NG | 222,160 |
| Ikot Ekpene | NG | 254,806 |
| Ilesa | NG | 325,000 |
| Iwo | NG | 250,443 |
| Jimeta | NG | 248,148 |
| Lekki | NG | 401,272 |
| Mubi | NG | 225,705 |
| Okene | NG | 479,178 |
| Ondo | NG | 375,000 |
| Saminaka | NG | 500,000 |
| Shagamu | NG | 214,558 |
| Ugep | NG | 200,276 |
| Zaria | NG | 980,000 |
| Bharatpur | NP | 369,377 |
| Birgañj | NP | 268,273 |
| Dhangaḍhi̇̄ | NP | 204,788 |
| Pokhara | NP | 600,051 |
| Ica | PE | 282,407 |
| Pucallpa | PE | 326,040 |
| Bacoor | PH | 356,974 |
| Bagong Silang | PH | 261,729 |
| Batangas | PH | 237,370 |
| Budta | PH | 1,273,715 |
| Butuan | PH | 309,709 |
| Cabanatuan City | PH | 343,672 |
| Cabuyao | PH | 308,745 |
| Cainta | PH | 283,172 |
| Calamba | PH | 575,046 |
| Caloocan | PH | 1,712,945 |
| Cebu City | PH | 965,332 |
| Commonwealth | PH | 215,034 |
| Cotabato | PH | 383,383 |
| Dasmariñas | PH | 441,876 |
| Davao | PH | 1,848,947 |
| General Santos | PH | 722,059 |
| Iligan | PH | 342,618 |
| Iligan City | PH | 312,323 |
| Imus | PH | 481,949 |
| Kabankalan | PH | 210,893 |
| Koronadal | PH | 201,844 |
| Lapu-Lapu City | PH | 497,813 |
| Las Piñas | PH | 615,549 |
| Libertad | PH | 250,353 |
| Lipa City | PH | 212,287 |
| Lucena | PH | 228,758 |
| Magugpo Poblacion | PH | 233,254 |
| Malabon | PH | 365,525 |
| Malingao | PH | 1,121,974 |
| Mandaluyong | PH | 425,000 |
| Mantampay | PH | 265,032 |
| Marawi City | PH | 259,993 |
| NIA Valencia | PH | 223,620 |
| Navotas | PH | 249,463 |
| Olongapo | PH | 221,178 |
| Pagadian | PH | 206,483 |
| Panabo | PH | 211,242 |
| Puerto Princesa | PH | 222,673 |
| San Jose del Monte | PH | 357,828 |
| San Pablo | PH | 300,166 |
| San Pedro | PH | 348,968 |
| Santol | PH | 298,976 |
| Taytay | PH | 231,460 |
| Toledo | PH | 206,692 |
| Valenzuela | PH | 725,173 |
| Arifwala | PK | 854,462 |
| Bahawalnagar | PK | 241,873 |
| Bahawalnagar | PK | 241,873 |
| Bahawalpur | PK | 903,795 |
| Bannu | PK | 1,357,890 |
| Battagram | PK | 700,000 |
| Bhawana | PK | 373,841 |
| Burewala | PK | 361,664 |
| Chak Jhumra | PK | 385,169 |
| Chunian | PK | 634,236 |
| Dadu | PK | 201,017 |
| Dera Ghazi Khan | PK | 494,464 |
| Dera Ismail Khan | PK | 763,195 |
| Digri | PK | 234,578 |
| Gilgit | PK | 216,760 |
| Gojra | PK | 214,000 |
| Gujrat | PK | 574,240 |
| Hafizabad | PK | 318,621 |
| Hyderabad | PK | 1,921,275 |
| Jacobabad | PK | 219,315 |
| Jalalpur Pirwala | PK | 500,000 |
| Jhang Sadr | PK | 606,533 |
| Kamoke | PK | 292,023 |
| Kasur | PK | 510,875 |
| Khuzdar | PK | 218,112 |
| Kunri | PK | 237,063 |
| Mardan | PK | 300,424 |
| Mingora | PK | 361,112 |
| Mirpur Khas | PK | 267,833 |
| Muridke | PK | 254,291 |
| Muzaffargarh | PK | 235,541 |
| Nawabshah | PK | 363,138 |
| Okara | PK | 533,693 |
| Pindi Bhattian | PK | 493,222 |
| Rahim Yar Khan | PK | 517,000 |
| Saddiqabad | PK | 274,210 |
| Sahiwal | PK | 538,344 |
| Sahiwal | PK | 538,344 |
| Sargodha | PK | 975,886 |
| Shahkot | PK | 244,868 |
| Shikarpur | PK | 204,938 |
| Sialkot | PK | 911,817 |
| Sinjhoro | PK | 354,709 |
| Skardu | PK | 260,000 |
| Sukkur | PK | 563,851 |
| Talhar | PK | 200,014 |
| Tando Allahyar | PK | 421,923 |
| Tando Bago | PK | 426,535 |
| Ciudad del Este | PY | 301,815 |
| Angarsk | RU | 243,158 |
| Biysk | RU | 215,430 |
| Blagoveshchensk | RU | 225,091 |
| Bratsk | RU | 256,600 |
| Cheboksary | RU | 492,331 |
| Cherepovets | RU | 315,738 |
| Ivanovo | RU | 406,113 |
| Izhevsk | RU | 648,213 |
| Kaluga | RU | 340,851 |
| Kostroma | RU | 277,280 |
| Kurgan | RU | 309,285 |
| Lipetsk | RU | 509,735 |
| Makhachkala | RU | 596,356 |
| Murmansk | RU | 295,374 |
| Nizhnevartovsk | RU | 244,937 |
| Nizhny Tagil | RU | 381,116 |
| Novorossiysk | RU | 241,856 |
| Orsk | RU | 246,836 |
| Prokop’yevsk | RU | 219,000 |
| Pskov | RU | 210,501 |
| Rybinsk | RU | 216,724 |
| Shakhty | RU | 221,312 |
| Staryy Oskol | RU | 226,977 |
| Surgut | RU | 300,367 |
| Syktyvkar | RU | 245,083 |
| Taganrog | RU | 279,056 |
| Tomsk | RU | 574,002 |
| Velikiy Novgorod | RU | 222,868 |
| Volzhsky | RU | 323,293 |
| Voronezh | RU | 1,047,549 |
| Yakutsk | RU | 235,600 |
| Yoshkar-Ola | RU | 268,272 |
| Al Jubayl | SA | 237,274 |
| Al Mubarraz | SA | 290,802 |
| Madinah | SA | 1,300,000 |
| Sulţānah | SA | 946,697 |
| Tabuk | SA | 667,000 |
| Yanbu | SA | 200,161 |
| Şabyā | SA | 228,375 |
| Al Qadarif | SD | 363,945 |
| El Daein | SD | 264,734 |
| El Fasher | SD | 252,609 |
| Kassala | SD | 401,477 |
| Khartoum North | SD | 1,012,211 |
| Kosti | SD | 345,068 |
| Nyala | SD | 565,734 |
| Singa | SD | 250,000 |
| Punggol | SG | 204,150 |
| Mbour | SN | 284,189 |
| Touba | SN | 1,120,824 |
| Ziguinchor | SN | 214,874 |
| Berbera | SO | 242,344 |
| Borama | SO | 597,842 |
| Kismayo | SO | 234,852 |
| Marka | SO | 230,100 |
| Juba | SS | 450,000 |
| Winejok | SS | 300,000 |
| Yei | SS | 260,720 |
| Ar Raqqah | SY | 531,952 |
| Ţarţūs | SY | 458,327 |
| Istaravshan | TJ | 273,500 |
| Konibodom | TJ | 211,100 |
| Alanya | TR | 364,180 |
| Antakya | TR | 399,045 |
| Balıkesir | TR | 238,151 |
| Bağcılar | TR | 740,069 |
| Beylikdüzü | TR | 415,290 |
| Diyarbakır | TR | 1,833,684 |
| Eskişehir | TR | 921,630 |
| Gebze | TR | 281,436 |
| Karabağlar | TR | 479,338 |
| Kayseri | TR | 1,452,458 |
| Küçükçekmece | TR | 792,030 |
| Muratpaşa | TR | 450,000 |
| Nilüfer | TR | 536,365 |
| Sancaktepe | TR | 489,848 |
| Sultanbeyli | TR | 358,201 |
| Sultangazi | TR | 436,935 |
| Van | TR | 525,016 |
| Çiğli | TR | 214,065 |
| Çorum | TR | 269,595 |
| Changhua | TW | 226,564 |
| Xizhi | TW | 204,619 |
| Yongkang | TW | 233,730 |
| Bariadi | TZ | 260,927 |
| Geita | TZ | 318,006 |
| Ifakara | TZ | 205,843 |
| Iringa | TZ | 202,490 |
| Kahama | TZ | 453,654 |
| Kasulu | TZ | 238,321 |
| Kibaha | TZ | 265,360 |
| Mbeya | TZ | 541,603 |
| Morogoro | TZ | 471,409 |
| Moshi | TZ | 221,733 |
| Mpanda | TZ | 204,338 |
| Singida | TZ | 232,459 |
| Songea | TZ | 286,285 |
| Sumbawanga | TZ | 303,986 |
| Tabora | TZ | 308,741 |
| Tunduma | TZ | 219,309 |
| Kasangati | UG | 207,800 |
| Kyengera | UG | 285,400 |
| Chula Vista | US | 265,757 |
| Huntington Beach | US | 201,899 |
| Moreno Valley | US | 204,198 |
| Oxnard | US | 207,254 |
| Marg‘ilon | UZ | 253,500 |
| Nukus | UZ | 332,500 |
| Alto Barinas | VE | 284,289 |
| Barcelona | VE | 815,141 |
| Barquisimeto | VE | 1,240,714 |
| Cabimas | VE | 351,736 |
| Ciudad Bolívar | VE | 412,619 |
| Ciudad Ojeda | VE | 240,283 |
| Coro | VE | 246,657 |
| Cumaná | VE | 405,626 |
| El Tigre | VE | 222,450 |
| Guarenas | VE | 248,588 |
| Guatire | VE | 227,666 |
| Los Teques | VE | 252,242 |
| Maturín | VE | 647,459 |
| Petare | VE | 364,684 |
| Porlamar | VE | 216,234 |
| Puerto La Cruz | VE | 370,000 |
| San Felipe | VE | 206,270 |
| San Fernando de Apure | VE | 229,197 |
| Santa Teresa del Tuy | VE | 278,890 |
| Turmero | VE | 344,700 |
| Valera | VE | 244,708 |
| An Nhơn | VN | 308,396 |
| Ba Vì | VN | 282,600 |
| Buôn Ma Thuột | VN | 434,256 |
| Bắc Giang | VN | 450,000 |
| Bắc Ninh | VN | 287,658 |
| Bến Cát | VN | 364,578 |
| Chí Linh | VN | 220,421 |
| Cà Mau | VN | 226,372 |
| Dĩ An | VN | 463,023 |
| Gia Lâm | VN | 309,353 |
| Hai Bà Trưng | VN | 303,586 |
| Hải Dương | VN | 241,373 |
| Kon Tum | VN | 205,762 |
| Long Bien | VN | 347,829 |
| Long Xuyên | VN | 286,140 |
| Lạng Sơn | VN | 200,108 |
| Mỹ Tho | VN | 270,700 |
| Nghi Sơn | VN | 302,210 |
| Ninh Hòa | VN | 230,566 |
| Phan Rang-Tháp Chàm | VN | 207,998 |
| Phan Thiết | VN | 228,536 |
| Phu Quoc | VN | 294,419 |
| Phú Mỹ | VN | 287,055 |
| Phổ Yên | VN | 231,363 |
| Quảng Ngãi | VN | 278,496 |
| Quận Mười Một | VN | 332,536 |
| Quận Sáu | VN | 271,050 |
| Sa Dec | VN | 214,610 |
| Sóc Trăng | VN | 221,430 |
| Sơn Tây | VN | 230,577 |
| Thanh Khê | VN | 201,240 |
| Thanh Xuân | VN | 293,292 |
| Thuận An | VN | 588,616 |
| Thành Phố Bà Rịa | VN | 235,192 |
| Thái Nguyên | VN | 420,000 |
| Thị Trấn Đông Triều | VN | 248,896 |
| Thủ Đức | VN | 524,670 |
| Việt Yên | VN | 205,900 |
| Xuân Lộc | VN | 253,140 |
| Ðà Lạt | VN | 258,014 |
| Điện Bàn | VN | 226,564 |
| Đống Đa | VN | 371,606 |
| Ibb | YE | 771,514 |
| Boksburg | ZA | 445,168 |
| Centurion | ZA | 236,580 |
| Evaton | ZA | 725,468 |
| Kariega | ZA | 291,052 |
| Newcastle | ZA | 404,838 |
| Vereeniging | ZA | 474,681 |
| Chipata | ZM | 327,059 |
| Solwezi | ZM | 301,370 |
| Chitungwiza | ZW | 371,246 |

Sources, licenses, and refresh commands: [README](README.md).
