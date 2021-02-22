# Apache Kafka サンプル

このプロジェクトは Apache Kafka の ETL 機能についての検証サンプルである。

ETL とは Extract（抽出）、Transform（変換）、Load（格納）の略で、異なるソースの異なるフォーマットのデータを統合する際に発生するプロセスの頭文字を取ったもの。

Kafka とは元々はスループット、スケーラビリティに優れた分散メッセージキューで、メッセージパイプラインに変換処理を差し込むことで ETL を実現する。

![Kafka Cluster](producer_consumer.png)

図 1: Kafka の概要（<https://kafka.apache.org/090/documentation.html> より引用）

このサンプルでは、同一のトピックに異なるソースデータを異なるキーでメッセージを流し、ストリーム処理の途中で同一フォーマットに変換し後工程に流す。データのサンプルとして以下を選定[^sample-data]した。

- [日本の祝日・休日（CSV 形式、Shift_JIS）](https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv)
- [アメリカの祝日・休日（HTML 形式、ASCII）](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/#url=2021)

これらの任意の年のデータを抽出し、以下のフォーマットに変換する。

```csv
2021-01-01,jp,元日
2021-01-11,jp,成人の日
2021-02-11,jp,建国記念の日
...
2021-01-01,us,New Year’s Day
2021-01-18,us,"Birthday of Martin Luther King, Jr."
2021-01-20,us,Inauguration Day
...
```

このサンプルは以下のように試すことができる。

## Docker コンテナの作成

以下の手順でコンテナを作成する。

```shell-session
$ # イメージ作成
$ docker build -t debian/kafka-sample:latest .
...
$ # コンテナ作成＆バックグラウンド実行
$ docker run -v `pwd`:/root --name kafka-sample -it -d debian/kafka-sample:latest /bin/bash
...
$
```

## 検証手順

ホスト側のターミナルで以下を実行し Kafka のライブラリを展開する。

```shell-session
$ curl -LOk https://ftp.jaist.ac.jp/pub/apache/kafka/2.7.0/kafka_2.13-2.7.0.tgz
...
$ tar -xzf kafka_2.13-2.7.0.tgz
...
$
```

ホスト側のターミナルで以下を実行し、Kafka 環境を整える。これらは ZooKeeper と Kafka の常駐サーバだが、コンテナを停止すると勝手に止まる。

```shell-session
$ docker exec -it kafka-sample /root/kafka_2.13-2.7.0/bin/zookeeper-server-start.sh /root/kafka_2.13-2.7.0/config/zookeeper.properties &
...
$ docker exec -it kafka-sample /root/kafka_2.13-2.7.0/bin/kafka-server-start.sh /root/kafka_2.13-2.7.0/config/server.properties &
...
$
```

ホスト側のターミナルで以下を実行し、生データを流すトピックと整形済みデータを流すトピックを作成する。

```shell-session
$ docker exec -it kafka-sample /root/kafka_2.13-2.7.0/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic holidays-raw
...
$ docker exec -it kafka-sample /root/kafka_2.13-2.7.0/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic holidays
...
$
```

ホスト側のターミナルからコンテナに入り以下を実行する。
このターミナルには整形済みデータが流れてくる。

```shell-session
$ docker exec -it kafka-sample /bin/bash
...
# cd
# npm ci
...
# node consumer.js
...
```

ホスト側の別のターミナルからコンテナに入り以下を実行する。
このターミナルでは日本およびアメリカの祝日・休日のフォーマット変換を行う。

```shell-session
$ docker exec -it kafka-sample /bin/bash
...
# cd
# node transformer.js 2021
...
```

ホスト側の別のターミナルからコンテナに入り以下を実行する。
日本の祝日・休日およびアメリカの祝日・休日を無整形のまま流す。

```shell-session
$ docker exec -it kafka-sample /bin/bash
...
# cd
# node producer.js jp < ./holidays-jp.csv
...
# node producer.js us < ./holidays-us.html
...
#
```

この検証プログラムでは、トピックにイベントが溜まっていくため、イベントを削除したい場合はホスト側のターミナルで以下を実行する。

```shell-session
$ docker exec -it kafka-sample /root/kafka_2.13-2.7.0/bin/kafka-delete-records.sh --bootstrap-server localhost:9092 --offset-json-file /root/offsetfile-holidays-raw.json && docker exec -it kafka-sample /root/kafka_2.13-2.7.0/bin/kafka-delete-records.sh --bootstrap-server localhost:9092 --offset-json-file /root/offsetfile-holidays.json
...
$
```

## Docker コンテナおよびイメージの削除

検証が終わったら以下の手順でコンテナとイメージを削除する。

```shell-session
$ # コンテナ終了
$ docker stop kafka-sample
...
$ # コンテナ削除
$ docker rm kafka-sample
...
$ # イメージ削除
$ docker rmi debian/kafka-sample
...
$
```

## 補足

Kafka には、任意のトピックに対する productor および consumer の動作確認が行えるシェルスクリプトが同梱されている。

Kafka の (Quickstart)[https://kafka.apache.org/quickstart] に記載されている通りだが、今回のサンプルに合わせた productor および consumer は以下の通り。これが使えると ETL ロジックのデバッグに役立つ。

```shell-session
$ # イベントの読み出し
$ docker exec -it kafka-sample /root/kafka_2.13-2.7.0/bin/kafka-console-consumer.sh --topic holidays --from-beginning --bootstrap-server localhost:9092
...
```

```shell-session
$ # イベントの書き込み
$ docker exec -it kafka-sample /root/kafka_2.13-2.7.0/bin/kafka-console-producer.sh --topic holidays --bootstrap-server localhost:9092
...
```

[^sample-data]: ダウンロード済みのファイルがそれぞれ [holidays-jp.csv](holidays-jp.csv)、[holidays-us.html](holidays-us.html) として保存済み。なお、HTML に関してはブラウザでアクセスしてからデベロッパーツールの Elements の HTML を保存しないと JavaScript で補完された完全な DOM が得られないため注意
