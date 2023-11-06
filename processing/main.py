import os
import pandas as pd
import glob


def transform(files): 
    li = []
    for f in files:
        df = pd.read_csv(f, header=None)
        df['filename'] = f.split('/')[-1].split('\\')[-1]
        df.columns = ['id', 'filename']
        df['topic'] = df['id'].apply(lambda x: x.split('_')[0])
        df['iteration'] = df['filename'].apply(lambda x: x.replace('.csv', '').split('_')[-1])
        df['buf_size'] = df['filename'].apply(lambda x: x.replace('.csv', '').split('_')[-3])
        # df['h0'] = df['id'].apply(lambda x: int(x.split('_')[1]) * 1000000000) 
        # df['h1'] = df['id'].apply(lambda x: x.split('_')[2])
        li.append(df)
    return pd.concat(li, ignore_index=True)

FOLDER = "./css_datarun2/naive/"
AEMC_FOLDER = os.path.join(FOLDER, "aemc_recorded/")
# SERVER_FOLDER = os.path.join(FOLDER, "css_recorded")
BROKER_FOLDER = os.path.join(FOLDER, "mqtt_broker/")
EMITTER_FOLDER = os.path.join(FOLDER, "mqtt_emitter/")
# print(AEMC_FOLDER)
aemc_files = glob.glob(os.path.join(AEMC_FOLDER, "*.csv"))
emitter_files = glob.glob(os.path.join(EMITTER_FOLDER, "*.csv"))
broker_files = glob.glob(os.path.join(BROKER_FOLDER, "*.csv"))

aemc_df = transform(aemc_files)
print(aemc_df)
aemc_df.to_csv('naive_css_aemc_df2.csv')

emitter_df = transform(emitter_files)
print(emitter_df.head)
emitter_df.to_csv('naive_css_emitter_df2.csv')

li = []
for f in broker_files:
    df = pd.read_csv(f, header=None)
    df['filename'] = f.split('/')[-1].split('\\')[-1]
    df.columns = ['id', 'topic', 'filename']
    df['id'] = df['id'].apply(lambda x: x.replace('packet data: ', ''))
    df['iteration'] = df['filename'].apply(lambda x: x.replace('.csv', '').split('_')[-1])
    df['duration'] = df['filename'].apply(lambda x: x.replace('.csv', '').split('_')[-3])
    df['topic'] = df['topic'].apply(lambda x: x.replace(' ', ''))
    li.append(df)

broker_df = pd.concat(li, ignore_index=True)
broker_df.to_csv('naive_css_broker_df2.csv')