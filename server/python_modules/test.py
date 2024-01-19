import unittest
import random
from openlocationcode import openlocationcode as olc
import p

OFFSET = 0.0001 
class TestBitmapPlusCodeConversion(unittest.TestCase):

    def test_corner_points(self, test_bitmap=None):
        num_points = 1
        if test_bitmap is None:
            test_bitmap = random.randint(0, 999999)  # Generate a random bitmap number if not provided

        # Convert bitmap to plus codes
        corners = p.bitmap_to_plus_codes(test_bitmap, num_points)

        # Assuming 'bitmap_to_plus_codes' returns a list of dictionaries, 
        # we need to iterate through each dictionary
        for corner in corners:
            self.assertEqual(p.plus_code_to_bitmap(corner['bottomLeft'], num_points), test_bitmap)
            self.assertEqual(p.plus_code_to_bitmap(corner['bottomRight'], num_points), test_bitmap)
            self.assertEqual(p.plus_code_to_bitmap(corner['topLeft'], num_points), test_bitmap)
            self.assertEqual(p.plus_code_to_bitmap(corner['topRight'], num_points), test_bitmap)

    def test_random_point_within_cell(self , test_bitmap=None):
            num_points = 1
            if test_bitmap is None:
                test_bitmap = random.randint(0, 999999)  # Generate a random bitmap number if not provided

            corners = p.bitmap_to_plus_codes(test_bitmap, num_points)

            # Get the first dictionary from the list
            corner_dict = corners[0]

            # Decode the Plus Codes to get their coordinates
            bottom_left = olc.decode(corner_dict['bottomLeft'])
            top_right = olc.decode(corner_dict['topRight'])

            # Generate random coordinates within the cell
            random_lat = random.uniform(bottom_left.latitudeLo, top_right.latitudeHi)
            random_lon = random.uniform(bottom_left.longitudeLo, top_right.longitudeHi)
            random_code = olc.encode(random_lat, random_lon)

            self.assertEqual(p.plus_code_to_bitmap(random_code, num_points), test_bitmap)

    def test_points_around_cell(self, test_bitmap=None):
        num_points = 1
        if test_bitmap is None:
            test_bitmap = random.randint(0, 999999)  # Generate a random bitmap number if not provided            
            #test_bitmap = 688171 # random.randint(0, 999999)  # Generate a random bitmap number
            
            corners = p.bitmap_to_plus_codes(test_bitmap, 1)
            
            # Get the first dictionary from the list
            corner_dict = corners[0]

            # Decode the Plus Codes to get their coordinates
            bottom_left = olc.decode(corner_dict['bottomLeft'])
            top_right = olc.decode(corner_dict['topRight'])

            LAT_PER_CELL, LON_PER_CELL = p.calculate_region_size(1)

                # Generate 8 specific points around the cell
            generated_points = [
                # North
                olc.encode(top_right.latitudeHi + OFFSET, (top_right.longitudeHi + bottom_left.longitudeLo) / 2), 
                # Northeast
                olc.encode(top_right.latitudeHi + OFFSET, top_right.longitudeHi + OFFSET), 
                # East
                olc.encode((top_right.latitudeHi + bottom_left.latitudeLo) / 2, top_right.longitudeHi + OFFSET), 
                # Southeast
                olc.encode(bottom_left.latitudeLo - OFFSET, top_right.longitudeHi + OFFSET), 
                # South
                olc.encode(bottom_left.latitudeLo - OFFSET, (top_right.longitudeHi + bottom_left.longitudeLo) / 2), 
                # Southwest
                olc.encode(bottom_left.latitudeLo - OFFSET, bottom_left.longitudeLo - OFFSET), 
                # West
                olc.encode((top_right.latitudeHi + bottom_left.latitudeLo) / 2, bottom_left.longitudeLo - OFFSET), 
                # Northwest
                olc.encode(top_right.latitudeHi + OFFSET, bottom_left.longitudeLo - OFFSET), 
            ]


            # Calculate expected adjacent bitmap numbers
            expected_bitmaps = p.calculate_adjacent_bitmaps(test_bitmap, p.NUM_ROWS, p.NUM_COLS)

            # Test each point
            for i, code in enumerate(generated_points):
                with self.subTest(point=code):
                    self.assertEqual(p.plus_code_to_bitmap(code, 1), expected_bitmaps[i])

    def test_neighbour_points(self, test_bitmap=None):
        num_points = 1
        if test_bitmap is None:
            test_bitmap = random.randint(0, 999999)

        corners = p.bitmap_to_plus_codes(test_bitmap, 1)
        corner_dict = corners[0]

        bottom_left = olc.decode(corner_dict['bottomLeft'])
        top_right = olc.decode(corner_dict['topRight'])

        # Generate adjacent Plus Codes
        generated_points = [
            p.get_next_plus_code(top_right.latitudeHi, (top_right.longitudeHi + bottom_left.longitudeLo) / 2, "north"),
            p.get_next_plus_code(top_right.latitudeHi, top_right.longitudeHi, "northeast"),
            p.get_next_plus_code((top_right.latitudeHi + bottom_left.latitudeLo) / 2, top_right.longitudeHi, "east"),
            p.get_next_plus_code(bottom_left.latitudeLo, top_right.longitudeHi, "southeast"),
            p.get_next_plus_code(bottom_left.latitudeLo, (top_right.longitudeHi + bottom_left.longitudeLo) / 2, "south"),
            p.get_next_plus_code(bottom_left.latitudeLo, bottom_left.longitudeLo, "southwest"),
            p.get_next_plus_code((top_right.latitudeHi + bottom_left.latitudeLo) / 2, bottom_left.longitudeLo, "west"),
            p.get_next_plus_code(top_right.latitudeHi, bottom_left.longitudeLo, "northwest"),
        ]

        expected_bitmaps = p.calculate_adjacent_bitmaps(test_bitmap, p.NUM_ROWS, p.NUM_COLS)

        for i, code in enumerate(generated_points):
            with self.subTest(point=code):
                self.assertEqual(p.plus_code_to_bitmap(code, 1), expected_bitmaps[i])
               
    def test_edge_bitmaps(self):
            edge_bitmaps = [0, 999, 999000, 999999, 499, 500, 1499, 1500, 499000, 500000, 999499, 999500]
            for bitmap in edge_bitmaps:
                with self.subTest(bitmap=bitmap):
                    self.test_corner_points(bitmap)
                    self.test_random_point_within_cell(bitmap)
                    self.test_points_around_cell(bitmap)

if __name__ == '__main__':
    unittest.main()


    # def test_single_point_conversion(self):
    #     # Test for one point
    #     num_points = 1
    #     test_bitmap = 123456  # Specific test bitmap number

    #     # Convert bitmap to plus codes
    #     regions = p.bitmap_to_plus_codes(test_bitmap, num_points)
    #     left_plus_code, right_plus_code = regions[0]['leftPlusCode'], regions[0]['rightPlusCode']

    #     # Check if left plus code maps back to the original bitmap
    #     self.assertEqual(p.plus_code_to_bitmap(left_plus_code, num_points), test_bitmap)

    #     # Check if right plus code maps back to the original bitmap
    #     self.assertEqual(p.plus_code_to_bitmap(right_plus_code, num_points), test_bitmap)

    #     # Test with a random point inside the boundaries
    #     inside_plus_code = 'YOUR_PLUS_CODE'
    #     self.assertEqual(p.plus_code_to_bitmap(inside_plus_code, num_points), test_bitmap)

    #     # Test with points outside the boundaries
    #     outside_plus_codes = ['PLUS_CODE_1', 'PLUS_CODE_2', 'PLUS_CODE_3', 'PLUS_CODE_4']
    #     for code in outside_plus_codes:
    #         self.assertNotEqual(p.plus_code_to_bitmap(code, num_points), test_bitmap)



# import random

# # Function definitions for p.bitmap_to_plus_codes and p.plus_code_to_bitmap go here

# def test_p.bitmap_to_plus_codes():
#     test_cases = 10  # Number of random test cases
#     for _ in range(test_cases):
#         # Generate a random bitmap number
#         bitmap_number = random.randint(0, TOTAL_BITMAPS - 1)

#         # Generate plus codes for the bitmap number
#         plus_codes = p.bitmap_to_plus_codes(bitmap_number)

#         # Test if the plus codes belong to the correct bitmap
#         for plus_code in plus_codes:
#             p.calculated_bitmap = p.plus_code_to_bitmap(plus_code)
#             assert p.calculated_bitmap == bitmap_number, f"Test failed for bitmap {bitmap_number}: {plus_code} returned bitmap {p.calculated_bitmap}"

#         print(f"Test passed for bitmap {bitmap_number}")

# def test_adjacent_bitmaps():
#     # Test a few adjacent bitmaps to ensure their plus codes don't overlap
#     adjacent_tests = [(100000, 100001), (50000, 50010), (999998, 999999)]  # Add more pairs as needed
#     for bitmap1, bitmap2 in adjacent_tests:
#         plus_codes_1 = p.bitmap_to_plus_codes(bitmap1)
#         plus_codes_2 = p.bitmap_to_plus_codes(bitmap2)

#         for code1 in plus_codes_1:
#             assert p.plus_code_to_bitmap(code1) == bitmap1, f"Adjacent test failed: {code1} should belong to {bitmap1}"
#         for code2 in plus_codes_2:
#             assert p.plus_code_to_bitmap(code2) == bitmap2, f"Adjacent test failed: {code2} should belong to {bitmap2}"
        
#         print(f"Adjacent test passed for {bitmap1} and {bitmap2}")

# if __name__ == "__main__":
#     test_p.bitmap_to_plus_codes()
#     test_adjacent_bitmaps()
