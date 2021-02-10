select name,total
from GameStat g
  join variants v on g.vid = v.id
where total > 0
order by total desc;
