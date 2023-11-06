import os
import pandas as pd


def lambda1(x):
    s = x.split('_')
    return (int(s[1]) * 1000000000) + int(s[2])

def lambda2(x):
    s = x.split('_')
    return s[1]

def lambda3(x):
    s = x.replace('$.txt', '')
    q = s.split('_')[-1]
    return q

file = 'naive_css_saved_output.csv'
df = pd.read_csv(file, header=None, index_col=False)
df.columns = ['id', 'filename', 'topic', 'id2', 'h0', 'h1']
df['time_slice'] = df['filename'].apply(lambda2)
df['iteration'] = df['filename'].apply(lambda3)
df['emit_time'] = df['id2'].apply(lambda1)
df['receive_time'] = (df['h0'] * 1000000000) + df['h1']
df['latency'] = (df['receive_time'] - df['emit_time'])

df.to_csv('naive_css_saved_df3.csv')