import sys
import math
from openlocationcode import openlocationcode as olc

#PLACETIME
#OPEN SOURCE MAPPING PROTOCOL FROM THE METAVERSE TO THE UNIVERSE

# Constants for the grid size
TOTAL_BITMAPS = 1000000
NUM_ROWS = 1000
NUM_COLS = 1000

# Initialize the number of points globally
num_points = 1

def calculate_region_size(num_points):
    # Scale factor for each side to ensure the area of each region is 1/num_points of the total area
    scale_factor =  math.sqrt(1 / num_points) # math.sqrt(1 / num_points)

    # Adjust the size of each region based on the scale factor
    return (180 / NUM_ROWS) * scale_factor, (360 / NUM_COLS) * scale_factor


def calculate_adjacent_bitmaps(bitmap_number, num_rows, num_cols):
    # Calculate the row and column from the bitmap number
    row = bitmap_number // num_cols
    col = bitmap_number % num_cols

    # Calculate adjacent bitmaps
    top_bitmap = ((row + 1) % num_rows) * num_cols + col
    top_right_bitmap = ((row + 1) % num_rows) * num_cols + ((col + 1) % num_cols)
    right_bitmap = row * num_cols + ((col + 1) % num_cols)
    bottom_right_bitmap = ((row - 1) % num_rows) * num_cols + ((col + 1) % num_cols)
    bottom_bitmap = ((row - 1) % num_rows) * num_cols + col
    bottom_left_bitmap = ((row - 1) % num_rows) * num_cols + ((col - 1) % num_cols)
    left_bitmap = row * num_cols + ((col - 1) % num_cols)
    top_left_bitmap = ((row + 1) % num_rows) * num_cols + ((col - 1) % num_cols)

    return [top_bitmap, top_right_bitmap, right_bitmap, bottom_right_bitmap, bottom_bitmap, bottom_left_bitmap, left_bitmap, top_left_bitmap]

def rotate_point(latitude, longitude, angle):
    # Convert to radians
    lat_rad = math.radians(latitude)
    lon_rad = math.radians(longitude)
    # Apply rotation
    new_lat_rad = lat_rad * math.cos(angle) - lon_rad * math.sin(angle)
    new_lon_rad = lat_rad * math.sin(angle) + lon_rad * math.cos(angle)
    # Convert back to degrees
    return math.degrees(new_lat_rad), math.degrees(new_lon_rad)

def get_next_plus_code(lat, lon, direction):
    increment = 0.0000001  # Small increment value for nudging the coordinates
    new_lat, new_lon = lat, lon

    while True:
        if direction == "north":
            new_lat += increment
        elif direction == "northeast":
            new_lat += increment
            new_lon += increment
        elif direction == "east":
            new_lon += increment
        elif direction == "southeast":
            new_lat -= increment
            new_lon += increment
        elif direction == "south":
            new_lat -= increment
        elif direction == "southwest":
            new_lat -= increment
            new_lon -= increment
        elif direction == "west":
            new_lon -= increment
        elif direction == "northwest":
            new_lat += increment
            new_lon -= increment

        new_code = olc.encode(new_lat, new_lon)
        if new_code != olc.encode(lat, lon):
            return new_code  # Return the first different Plus Code found


def bitmap_to_plus_codes(bitmap_number, num_points=1):
    # Calculate the size of each cell
    LAT_PER_CELL, LON_PER_CELL = calculate_region_size(num_points)
    # Determine row and column in the grid
    row = bitmap_number // NUM_COLS
    col = bitmap_number % NUM_COLS
    # Calculate base latitude and longitude
    base_latitude = -90 + row * LAT_PER_CELL
    base_longitude = -180 + col * LON_PER_CELL

    regions = []

    # Generate regions for rotated points
    for i in range(num_points):
        angle = math.pi * i
        rotated_lat, rotated_lon = rotate_point(base_latitude, base_longitude, angle)

        # Encode to Plus Codes with standard precision
        adjustment_value = 0.00001  # Adjust this value as needed
        bottom_left = olc.encode(rotated_lat, rotated_lon)
        bottom_right = olc.encode(rotated_lat, rotated_lon + LON_PER_CELL - adjustment_value)
        top_left = olc.encode(rotated_lat + LAT_PER_CELL - adjustment_value, rotated_lon)
        top_right = olc.encode(rotated_lat + LAT_PER_CELL - adjustment_value, 
                                    rotated_lon + LON_PER_CELL - adjustment_value)

        # Add the rotated codes to the regions list
        regions.append({
            'bottomLeft': bottom_left,
            'bottomRight': bottom_right,
            'topLeft': top_left,
            'topRight': top_right
        })
  
    return regions

def bitmap_to_plus_codes(bitmap_number, num_points=1):
    # Calculate the size of each cell
    LAT_PER_CELL, LON_PER_CELL = calculate_region_size(num_points)
    # Determine row and column in the grid
    row = bitmap_number // NUM_COLS
    col = bitmap_number % NUM_COLS
    # Calculate base latitude and longitude
    base_latitude = -90 + row * LAT_PER_CELL
    base_longitude = -180 + col * LON_PER_CELL

    regions = []

    # Generate regions for rotated points
    for i in range(num_points):
        angle = math.pi * i
        rotated_lat, rotated_lon = rotate_point(base_latitude, base_longitude, angle)

        # Encode to Plus Codes with standard precision
        adjustment_value = 0.00001  # Adjust this value as needed
        bottom_left = olc.encode(rotated_lat, rotated_lon)
        bottom_right = olc.encode(rotated_lat, rotated_lon + LON_PER_CELL - adjustment_value)
        top_left = olc.encode(rotated_lat + LAT_PER_CELL - adjustment_value, rotated_lon)
        top_right = olc.encode(rotated_lat + LAT_PER_CELL - adjustment_value, 
                                    rotated_lon + LON_PER_CELL - adjustment_value)

        # Add the rotated codes to the regions list
        regions.append({
            'bottomLeft': bottom_left,
            'bottomRight': bottom_right,
            'topLeft': top_left,
            'topRight': top_right
        })
  
    return regions

def bitmaps_to_plus_codes(bitmap_numbers, num_points=1):
    all_regions = []

    for bitmap in bitmap_numbers:
        # Get Plus Codes for each bitmap
        regions = bitmap_to_plus_codes(bitmap, num_points)
        all_regions.append(regions)

    return all_regions


def plus_code_to_bitmap(plus_code, num_points=2):
    # Calculate the size of each cell
    LAT_PER_CELL, LON_PER_CELL = calculate_region_size(num_points)
    decoded = olc.decode(plus_code)
    # Find the center of the decoded Plus Code area
    lat_center = (decoded.latitudeLo + decoded.latitudeHi) / 2
    lon_center = (decoded.longitudeLo + decoded.longitudeHi) / 2
    # Convert back to row and column
    row = int((lat_center + 90) / LAT_PER_CELL)
    col = int((lon_center + 180) / LON_PER_CELL)
    # Calculate bitmap number
    return row * NUM_COLS + col

# The rest of the script remains unchanged.

def main():
    global num_points

    print("Running placetime as p.py")
    print("Enter 'bp <bitmap_number>' to convert to Plus Codes.")
    print("Enter 'pb <plus_code>' to convert to bitmap number.")
    print("Enter 'setpoints <num_points>' to set the number of points (1, 2, or 6).")
    print("Type 'exit' to quit.")

    while True:
        input_cmd = input("Enter command: ").strip().split()

        if len(input_cmd) == 2 and input_cmd[0] == 'bp':
            try:
                bitmap_number = int(input_cmd[1])
                regions = bitmap_to_plus_codes(bitmap_number, num_points)
                for region in regions:
                    print(f"Region: Bottom Left: {region['bottomLeft']}, Bottom Right: {region['bottomRight']}, Top Left: {region['topLeft']}, Top Right: {region['topRight']}")
            except ValueError:
                print("Invalid input. Bitmap number must be an integer.")
        elif len(input_cmd) == 2 and input_cmd[0] == 'pb':
            try:
                plus_code = input_cmd[1]
                bitmap_number = plus_code_to_bitmap(plus_code, num_points)
                print(f"Bitmap number: {bitmap_number}")
            except ValueError:
                print("Invalid plus code.")
        elif len(input_cmd) == 2 and input_cmd[0] == 'setpoints':
            try:
                new_num_points = int(input_cmd[1])
                if new_num_points in [1, 2, 6]:
                    num_points = new_num_points
                    print(f"Number of points set to {num_points}.")
                else:
                    print("Number of points must be 1, 2, or 6.")
            except ValueError:
                print("Invalid input. Number of points must be an integer.")
        elif input_cmd[0] == 'exit':
            break
        else:
            print("Invalid input. Try again.")

if __name__ == "__main__":
    main()
