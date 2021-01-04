#!/usr/bin/env python

# Manually (for now: TODO) add an entry in GameStat when a variant is added

from dbconnect import create_connection

def sync_gamestat():
    """
    (Incrementally) Synchronize GameStat table from Variants update
    """

    conn = create_connection()
    cur = conn.cursor()

    cur.execute("SELECT max(vid) FROM GameStat");
    vid_max = cur.fetchone()[0] or 0
    cur.execute("SELECT id FROM Variants WHERE id > ?", (vid_max,))
    rows = cur.fetchall()
    for variant in rows:
        cur.execute("INSERT INTO GameStat(vid) VALUES (?)", (variant[0],))

    conn.commit()
    cur.close()

sync_gamestat()
