select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'leave_company',
    'get_my_company_leaderboard',
    'get_my_company_dashboard'
  )
order by routine_name;