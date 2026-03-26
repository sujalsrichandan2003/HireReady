import requests
import sys
import json
from datetime import datetime

class MockMateAPITester:
    def __init__(self, base_url="https://practice-interviews-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_tracks_endpoint(self):
        """Test tracks endpoint"""
        return self.run_test("Get Tracks", "GET", "tracks", 200)

    def test_auth_me_without_token(self):
        """Test auth/me without token (should fail)"""
        return self.run_test("Auth Me (No Token)", "GET", "auth/me", 401)

    def test_session_exchange_invalid(self):
        """Test session exchange with invalid session_id"""
        return self.run_test(
            "Session Exchange (Invalid)",
            "POST",
            "auth/session",
            401,
            data={"session_id": "invalid_session_id"}
        )

    def test_protected_routes_without_auth(self):
        """Test protected routes without authentication"""
        protected_endpoints = [
            ("interviews/history", "GET"),
            ("progress/stats", "GET"),
            ("progress/recommendations", "GET"),
            ("reports", "GET"),
            ("settings", "PUT")
        ]
        
        results = []
        for endpoint, method in protected_endpoints:
            success, _ = self.run_test(
                f"Protected Route: {endpoint}",
                method,
                endpoint,
                401,
                data={} if method == "PUT" else None
            )
            results.append(success)
        
        return all(results)

    def test_interview_start_without_auth(self):
        """Test starting interview without authentication"""
        return self.run_test(
            "Start Interview (No Auth)",
            "POST",
            "interviews/start",
            401,
            data={"track": "python", "difficulty": "medium"}
        )

def main():
    print("🚀 Starting MockMate API Testing...")
    print("=" * 50)
    
    # Setup
    tester = MockMateAPITester()
    
    # Test basic endpoints
    print("\n📋 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    tester.test_tracks_endpoint()
    
    # Test authentication
    print("\n🔐 Testing Authentication...")
    tester.test_auth_me_without_token()
    tester.test_session_exchange_invalid()
    
    # Test protected routes
    print("\n🛡️ Testing Protected Routes...")
    tester.test_protected_routes_without_auth()
    tester.test_interview_start_without_auth()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for test in tester.failed_tests:
            error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
            print(f"   - {test['name']}: {error_msg}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\n🎯 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())