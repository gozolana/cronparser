import re
from datetime import datetime, timedelta
from typing import Iterator, List, Optional

MONTH_MAP = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4,
    'MAY': 5, 'JUN': 6, 'JUL': 7, 'AUG': 8,
    'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
}
DOW_MAP = {
    'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3,
    'THU': 4, 'FRI': 5, 'SAT': 6
}

def replace_month_string(field: str) -> str:
    def repl(match):
        return str(MONTH_MAP[match.group(0)])
    return re.sub('|'.join(MONTH_MAP.keys()), repl, field)

def replace_dow_string(field: str) -> str:
    def repl(match):
        return str(DOW_MAP[match.group(0)])
    return re.sub('|'.join(DOW_MAP.keys()), repl, field)

def parse_range(range_str: str, min_: int, max_: int, field_name: str) -> List[int]:
    if range_str == '*':
        return list(range(min_, max_ + 1))
    if re.fullmatch(r'\d+', range_str):
        value = int(range_str)
        if value < min_ or value > max_:
            raise ValueError(f"{field_name} field contains out of range value '{value}'")
        return [value]
    if re.fullmatch(r'\d+-\d+', range_str):
        start, end = map(int, range_str.split('-'))
        if start > end or start < min_ or end > max_:
            raise ValueError(f"{field_name} field contains invalid range '{range_str}'")
        return list(range(start, end + 1))
    raise ValueError(f"{field_name} field contains invalid range '{range_str}'")

def parse_part(part: str, min_: int, max_: int, field_name: str) -> List[int]:
    if '/' in part:
        range_str, step_str = part.split('/')
        range_vals = parse_range(range_str, min_, max_, field_name)
        if not step_str.isdigit() or int(step_str) <= 0:
            raise ValueError(f"{field_name} field contains invalid step value '{step_str}'")
        step = int(step_str)
        return [v for v in range_vals if (v - min_) % step == 0]
    return parse_range(part, min_, max_, field_name)

def parse_field(field: str, min_: int, max_: int, field_name: str) -> List[int]:
    if not isinstance(field, str):
        raise TypeError(f"{field_name} must be a string")
    result = []
    for part in field.split(','):
        result.extend(parse_part(part, min_, max_, field_name))
    return sorted(set(result))

def to_next_value(current: int, candidates: List[int], min_: int, max_: int) -> int:
    for candidate in sorted(candidates):
        if candidate >= current:
            return candidate - current
    return candidates[0] + max_ + min_ + 1 - current

def shift_time(dt: datetime, minutes: List[int], hours: List[int]) -> datetime:
    # Find next valid minute
    add_minute = to_next_value(dt.minute, minutes, 0, 59)
    dt = dt + timedelta(minutes=add_minute)
    # Find next valid hour
    if dt.minute not in minutes:
        dt = dt.replace(minute=minutes[0])
    add_hour = to_next_value(dt.hour, hours, 0, 23)
    if add_hour > 0:
        dt = dt + timedelta(hours=add_hour)
        dt = dt.replace(minute=minutes[0])
    return dt

def shift_date(dt: datetime, dom: List[int], month: List[int], dow: List[int]) -> datetime:
    while True:
        if (dt.day in dom and (dt.month in month) and (dt.weekday() in dow)):
            break
        dt += timedelta(days=1)
        dt = dt.replace(hour=0, minute=0)
    return dt

class CronScheduleIterator(Iterator[datetime]):
    def __init__(self, minute, hour, dom, month, dow, start_date: Optional[datetime] = None):
        self.minute = minute
        self.hour = hour
        self.dom = dom
        self.month = month
        self.dow = [0 if d == 7 else d for d in dow]
        self.current = (start_date or datetime.now()).replace(second=0, microsecond=0) + timedelta(minutes=1)

    def __iter__(self):
        return self

    def __next__(self) -> datetime:
        while True:
            dt = self.current
            dt = shift_time(dt, self.minute, self.hour)
            dt = shift_date(dt, self.dom, self.month, self.dow)
            if dt < self.current:
                raise StopIteration
            self.current = dt + timedelta(minutes=1)
            return dt

def parse_cron_expression(expr: str, start_date: Optional[datetime] = None) -> CronScheduleIterator:
    if not isinstance(expr, str):
        raise TypeError('Cron expression must be a string')
    fields = expr.strip().split()
    if len(fields) != 5:
        raise ValueError('Cron expression must have five fields')
    minute = parse_field(fields[0], 0, 59, 'minute')
    hour = parse_field(fields[1], 0, 23, 'hour')
    dom = parse_field(fields[2], 1, 31, 'day of month')
    month = parse_field(replace_month_string(fields[3]), 1, 12, 'month')
    dow = parse_field(replace_dow_string(fields[4]), 0, 7, 'day of week')
    if 7 in dow:
        dow = [d if d != 7 else 0 for d in dow]
    return CronScheduleIterator(minute, hour, dom, month, dow, start_date)

def format_local(dt: datetime) -> str:
    return dt.strftime('%Y/%m/%d %H:%M(%z)')

def format_utc(dt: datetime) -> str:
    return dt.strftime('%Y/%m/%d %H:%M(UTC)')
