from playwright.sync_api import sync_playwright
import os
import time

def verify_batch_tab():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000")
            page.wait_for_selector("text=Image Modifier", timeout=10000)

            print("Clicking Batch Process tab...")
            # Click the tab trigger for batch
            page.get_by_role("tab", name="Batch Process").click()

            # Wait for content
            page.wait_for_selector("text=Batch Processing", state="visible")

            print("Uploading image...")
            # The input might be hidden but accessible via label or direct selector
            # Try setting input files directly
            # Ensure the input is attached
            page.wait_for_selector("input[type='file']", state="attached")
            page.set_input_files("input[type='file']", "test_image.png")

            print("Waiting for image to appear in list...")
            # Image uploader shows the list of images. Just "test_image" might be enough.
            page.wait_for_selector("text=test_image", timeout=5000)

            print("Checking settings panel...")
            # Settings panel should be visible
            # Check for "Image Settings" title
            page.wait_for_selector("text=Image Settings", state="visible")

            # Change width
            # Find the width input. It's a number input.
            # Label "WIDTH" is followed by input.
            # Use get_by_label if possible, but the label is likely separate element.
            # In the screenshot, "WIDTH" is small text above the input.

            # Try to find input by placeholder or value. Value is "1".
            width_input = page.locator("input[value='1']").first
            if width_input.is_visible():
                width_input.fill("100")
                print("Changed width to 100")
            else:
                # Fallback: look for inputs in the settings panel
                inputs = page.locator(".space-y-1 input[type='number']").all()
                if inputs:
                    inputs[0].fill("100")
                    print("Changed width to 100 (fallback)")
                else:
                    print("Could not find width input")

            # Wait a bit
            time.sleep(1)

            # Take screenshot
            screenshot_path = "verification/batch_tab_verified.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_batch_tab()
